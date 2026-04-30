import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { SESSION_COOKIE_NAME } from "@recruitflow/config";
import type {
  AuthAccountDeleteRequest,
  AuthAccountDeleteResponse,
  AuthAccountUpdateRequest,
  AuthAccountUpdateResponse,
  AuthPasswordUpdateRequest,
  AuthPasswordUpdateResponse,
  AuthSignInRequest,
  AuthSignInResponse,
  AuthSignOutResponse,
  AuthSignUpRequest,
  AuthSignUpResponse,
} from "@recruitflow/contracts";

import { db } from "../db/database";

// TODO(api-boundary): Move shared auth/audit helpers behind API-owned providers
// before adding new auth flows that depend on Nest lifecycle or test overrides.
import { comparePasswords, hashPassword } from "@/lib/auth/session";
import { verifySessionToken } from "@/lib/auth/session-token";
import { signSessionToken } from "@/lib/auth/session-token";
import { writeAuditLog } from "@/lib/db/audit";
import {
  AuditAction,
  ActivityType,
  activityLogs,
  auditLogs,
  invitations,
  teamMembers,
  teams,
  users,
  type NewActivityLog,
  type NewTeam,
  type NewTeamMember,
  type NewUser,
  type WorkspaceRole,
} from "@/lib/db/schema";

export type ApiAuthContext = {
  expires: string;
  userId: string;
};

type SessionRequest = {
  headers: {
    cookie?: string;
  };
};

const unauthorized = () => new UnauthorizedException("Unauthorized");

@Injectable()
export class AuthService {
  private async logActivity(
    teamId: string | null | undefined,
    userId: string,
    action: ActivityType,
  ) {
    if (teamId == null) {
      return;
    }

    const newActivity: NewActivityLog = {
      action,
      ipAddress: "",
      teamId,
      userId,
    };

    await db.insert(activityLogs).values(newActivity);
  }

  private extractSessionCookie(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return null;
    }

    const sessionCookie = cookieHeader
      .split(";")
      .map((chunk) => chunk.trim())
      .find((chunk) => chunk.startsWith(`${SESSION_COOKIE_NAME}=`));

    if (!sessionCookie) {
      return null;
    }

    return decodeURIComponent(sessionCookie.slice(SESSION_COOKIE_NAME.length + 1));
  }

  async resolveAuthContext(request: SessionRequest): Promise<ApiAuthContext> {
    const sessionToken = this.extractSessionCookie(request.headers.cookie);

    if (!sessionToken) {
      throw unauthorized();
    }

    let sessionData;

    try {
      sessionData = await verifySessionToken(sessionToken);
    } catch {
      throw unauthorized();
    }

    if (
      !sessionData?.user ||
      typeof sessionData.user.id !== "string" ||
      typeof sessionData.expires !== "string"
    ) {
      throw unauthorized();
    }

    if (new Date(sessionData.expires) < new Date()) {
      throw unauthorized();
    }

    return {
      expires: sessionData.expires,
      userId: sessionData.user.id,
    };
  }

  private async createSessionTokenResponse(
    userId: string,
    role: WorkspaceRole,
  ): Promise<AuthSignInResponse> {
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const token = await signSessionToken({
      user: {
        id: userId,
      },
      expires,
    });

    return {
      expires,
      role,
      token,
      user: {
        id: userId,
      },
    };
  }

  private async getPrimaryWorkspaceForUser(userId: string) {
    const [membership] = await db
      .select({
        membershipId: teamMembers.id,
        role: teamMembers.role,
        teamId: teamMembers.teamId,
        workspaceName: teams.name,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId))
      .limit(1);

    return membership ?? null;
  }

  private async getActiveUser(userId: string) {
    const [user] = await db
      .select({
        email: users.email,
        id: users.id,
        name: users.name,
        passwordHash: users.passwordHash,
        role: users.role,
      })
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1);

    if (!user) {
      throw unauthorized();
    }

    return user;
  }

  async signIn(input: AuthSignInRequest): Promise<AuthSignInResponse> {
    const { email, password } = input;
    const [userWithWorkspace] = await db
      .select({
        membershipRole: teamMembers.role,
        teamId: teamMembers.teamId,
        user: {
          id: users.id,
          passwordHash: users.passwordHash,
          role: users.role,
        },
      })
      .from(users)
      .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    if (!userWithWorkspace) {
      throw new UnauthorizedException("Invalid email or password. Please try again.");
    }

    const isPasswordValid = await comparePasswords(
      password,
      userWithWorkspace.user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password. Please try again.");
    }

    const actorRole =
      userWithWorkspace.membershipRole ?? userWithWorkspace.user.role;

    await Promise.all([
      this.logActivity(
        userWithWorkspace.teamId,
        userWithWorkspace.user.id,
        ActivityType.SIGN_IN,
      ),
      writeAuditLog({
        workspaceId: userWithWorkspace.teamId,
        actorUserId: userWithWorkspace.user.id,
        actorRole,
        action: AuditAction.SIGN_IN,
        entityType: "workspace",
        entityId: userWithWorkspace.teamId,
        source: "api",
      }),
    ]);

    return this.createSessionTokenResponse(userWithWorkspace.user.id, actorRole);
  }

  async signUp(input: AuthSignUpRequest): Promise<AuthSignUpResponse> {
    const { email, inviteId, password } = input;
    const passwordHash = await hashPassword(password);
    const result = await db.transaction(async (tx) => {
      const existingUser = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new ConflictException("A user with that email already exists");
      }

      let acceptedInvitation:
        | {
            id: string;
            invitedBy: string;
            role: WorkspaceRole;
            teamId: string;
            workspaceName: string;
          }
        | null = null;

      if (inviteId) {
        const [invitation] = await tx
          .select({
            id: invitations.id,
            invitedBy: invitations.invitedBy,
            role: invitations.role,
            teamId: invitations.teamId,
            workspaceName: teams.name,
          })
          .from(invitations)
          .innerJoin(teams, eq(invitations.teamId, teams.id))
          .where(
            and(
              eq(invitations.id, inviteId),
              eq(invitations.email, email),
              eq(invitations.status, "pending"),
            ),
          )
          .limit(1);

        if (!invitation) {
          throw new BadRequestException("Invalid or expired invitation.");
        }

        acceptedInvitation = invitation;
      }

      const newUser: NewUser = {
        email,
        passwordHash,
        role: acceptedInvitation?.role ?? "owner",
      };
      const [createdUser] = await tx.insert(users).values(newUser).returning();

      if (!createdUser) {
        throw new InternalServerErrorException("Failed to create user");
      }

      let teamId: string;
      let userRole: WorkspaceRole;
      let workspaceName: string;
      let invitedByUserId: string | null = null;

      if (acceptedInvitation) {
        teamId = acceptedInvitation.teamId;
        userRole = acceptedInvitation.role;
        workspaceName = acceptedInvitation.workspaceName;
        invitedByUserId = acceptedInvitation.invitedBy;

        await tx
          .update(invitations)
          .set({ status: "accepted" })
          .where(eq(invitations.id, acceptedInvitation.id));

        await tx.insert(activityLogs).values({
          action: ActivityType.ACCEPT_INVITATION,
          ipAddress: "",
          teamId,
          userId: createdUser.id,
        });
      } else {
        const newWorkspace: NewTeam = {
          name: `${email}'s Workspace`,
        };
        const [createdWorkspace] = await tx
          .insert(teams)
          .values(newWorkspace)
          .returning();

        if (!createdWorkspace) {
          throw new InternalServerErrorException("Failed to create workspace");
        }

        teamId = createdWorkspace.id;
        userRole = "owner";
        workspaceName = createdWorkspace.name;

        await tx.insert(activityLogs).values({
          action: ActivityType.CREATE_TEAM,
          ipAddress: "",
          teamId,
          userId: createdUser.id,
        });
        await tx.insert(auditLogs).values({
          action: AuditAction.WORKSPACE_CREATED,
          actorUserId: createdUser.id,
          entityId: teamId,
          entityType: "workspace",
          metadataJson: {
            actorRole: userRole,
            source: "api",
            workspaceName,
          },
          workspaceId: teamId,
        });
      }

      const newMembership: NewTeamMember = {
        invitedByUserId,
        role: userRole,
        teamId,
        userId: createdUser.id,
      };
      const [createdMembership] = await tx
        .insert(teamMembers)
        .values(newMembership)
        .returning();

      if (!createdMembership) {
        throw new InternalServerErrorException("Failed to create membership");
      }

      await tx.insert(activityLogs).values({
        action: ActivityType.SIGN_UP,
        ipAddress: "",
        teamId,
        userId: createdUser.id,
      });
      await tx.insert(auditLogs).values({
        action: AuditAction.MEMBER_JOINED,
        actorUserId: createdUser.id,
        entityId: createdMembership.id,
        entityType: "membership",
        metadataJson: {
          actorRole: userRole,
          joinedViaInvitation: Boolean(inviteId),
          source: "api",
          workspaceName,
        },
        workspaceId: teamId,
      });

      return {
        role: userRole,
        userId: createdUser.id,
      };
    });

    return this.createSessionTokenResponse(result.userId, result.role);
  }

  async signOut(context: ApiAuthContext): Promise<AuthSignOutResponse> {
    const membership = await this.getPrimaryWorkspaceForUser(context.userId);

    await Promise.all([
      this.logActivity(membership?.teamId, context.userId, ActivityType.SIGN_OUT),
      writeAuditLog({
        workspaceId: membership?.teamId,
        actorUserId: context.userId,
        actorRole: membership?.role,
        action: AuditAction.SIGN_OUT,
        entityType: "workspace",
        entityId: membership?.teamId,
        source: "api",
      }),
    ]);

    return { success: true };
  }

  async updatePassword(
    context: ApiAuthContext,
    input: AuthPasswordUpdateRequest,
  ): Promise<AuthPasswordUpdateResponse> {
    const { confirmPassword, currentPassword, newPassword } = input;
    const user = await this.getActiveUser(context.userId);
    const isPasswordValid = await comparePasswords(
      currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new BadRequestException("Current password is incorrect.");
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException(
        "New password must be different from the current password.",
      );
    }

    if (confirmPassword !== newPassword) {
      throw new BadRequestException(
        "New password and confirmation password do not match.",
      );
    }

    const newPasswordHash = await hashPassword(newPassword);
    const membership = await this.getPrimaryWorkspaceForUser(context.userId);

    await Promise.all([
      db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, context.userId)),
      this.logActivity(
        membership?.teamId,
        context.userId,
        ActivityType.UPDATE_PASSWORD,
      ),
      writeAuditLog({
        workspaceId: membership?.teamId,
        actorUserId: context.userId,
        actorRole: membership?.role ?? user.role,
        action: AuditAction.PASSWORD_UPDATED,
        entityType: "workspace",
        entityId: membership?.teamId,
        source: "api",
      }),
    ]);

    return { success: "Password updated successfully." };
  }

  async updateAccount(
    context: ApiAuthContext,
    input: AuthAccountUpdateRequest,
  ): Promise<AuthAccountUpdateResponse> {
    const { email, name } = input;
    const user = await this.getActiveUser(context.userId);
    const [emailOwner] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.email, email),
          ne(users.id, context.userId),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (emailOwner) {
      throw new ConflictException("A user with that email already exists");
    }

    const membership = await this.getPrimaryWorkspaceForUser(context.userId);

    await Promise.all([
      db
        .update(users)
        .set({ email, name })
        .where(eq(users.id, context.userId)),
      this.logActivity(
        membership?.teamId,
        context.userId,
        ActivityType.UPDATE_ACCOUNT,
      ),
      writeAuditLog({
        workspaceId: membership?.teamId,
        actorUserId: context.userId,
        actorRole: membership?.role ?? user.role,
        action: AuditAction.ACCOUNT_UPDATED,
        entityType: "workspace",
        entityId: membership?.teamId,
        source: "api",
        metadata: {
          emailChanged: email !== user.email,
          nameChanged: name !== user.name,
        },
      }),
    ]);

    return { name, success: "Account updated successfully." };
  }

  async deleteAccount(
    context: ApiAuthContext,
    input: AuthAccountDeleteRequest,
  ): Promise<AuthAccountDeleteResponse> {
    const user = await this.getActiveUser(context.userId);
    const isPasswordValid = await comparePasswords(
      input.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new BadRequestException("Incorrect password. Account deletion failed.");
    }

    const membership = await this.getPrimaryWorkspaceForUser(context.userId);

    await db.transaction(async (tx) => {
      if (membership?.teamId) {
        await tx.insert(activityLogs).values({
          action: ActivityType.DELETE_ACCOUNT,
          ipAddress: "",
          teamId: membership.teamId,
          userId: context.userId,
        });
        await tx.insert(auditLogs).values({
          action: AuditAction.ACCOUNT_DELETED,
          actorUserId: context.userId,
          entityId: context.userId,
          entityType: "membership",
          metadataJson: {
            actorRole: membership.role,
            source: "api",
          },
          workspaceId: membership.teamId,
        });
      }

      await tx
        .update(users)
        .set({
          deletedAt: sql`CURRENT_TIMESTAMP`,
          email: sql`CONCAT(email, '-', id, '-deleted')`,
        })
        .where(eq(users.id, context.userId));

      await tx.delete(teamMembers).where(eq(teamMembers.userId, context.userId));
    });

    return { success: true };
  }
}
