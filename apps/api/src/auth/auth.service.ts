import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { SESSION_COOKIE_NAME } from "@recruitflow/config";
import type { AuthSignUpRequest, AuthSignUpResponse } from "@recruitflow/contracts";

import { db } from "../db/database";

import { hashPassword } from "@/lib/auth/session";
import { verifySessionToken } from "@/lib/auth/session-token";
import { signSessionToken } from "@/lib/auth/session-token";
import { writeAuditLog } from "@/lib/db/audit";
import {
  AuditAction,
  ActivityType,
  activityLogs,
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
  userId: number;
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
    teamId: number | null | undefined,
    userId: number,
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
      typeof sessionData.user.id !== "number" ||
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

  async signUp(input: AuthSignUpRequest): Promise<AuthSignUpResponse> {
    const { email, inviteId, password } = input;
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new ConflictException("A user with that email already exists");
    }

    const passwordHash = await hashPassword(password);
    const newUser: NewUser = {
      email,
      passwordHash,
      role: "owner",
    };
    const [createdUser] = await db.insert(users).values(newUser).returning();

    if (!createdUser) {
      throw new InternalServerErrorException("Failed to create user");
    }

    let teamId: number;
    let userRole: WorkspaceRole;
    let workspaceName: string;

    if (inviteId) {
      const [invitation] = await db
        .select({
          id: invitations.id,
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

      teamId = invitation.teamId;
      userRole = invitation.role;
      workspaceName = invitation.workspaceName;

      await db
        .update(invitations)
        .set({ status: "accepted" })
        .where(eq(invitations.id, invitation.id));

      await this.logActivity(teamId, createdUser.id, ActivityType.ACCEPT_INVITATION);
    } else {
      const newWorkspace: NewTeam = {
        name: `${email}'s Workspace`,
      };
      const [createdWorkspace] = await db
        .insert(teams)
        .values(newWorkspace)
        .returning();

      if (!createdWorkspace) {
        throw new InternalServerErrorException("Failed to create workspace");
      }

      teamId = createdWorkspace.id;
      userRole = "owner";
      workspaceName = createdWorkspace.name;

      await Promise.all([
        this.logActivity(teamId, createdUser.id, ActivityType.CREATE_TEAM),
        writeAuditLog({
          workspaceId: teamId,
          actorUserId: createdUser.id,
          actorRole: userRole,
          action: AuditAction.WORKSPACE_CREATED,
          entityType: "workspace",
          entityId: teamId,
          source: "server_action",
          metadata: {
            workspaceName,
          },
        }),
      ]);
    }

    const newMembership: NewTeamMember = {
      role: userRole,
      teamId,
      userId: createdUser.id,
    };
    const [createdMembership] = await db
      .insert(teamMembers)
      .values(newMembership)
      .returning();

    if (!createdMembership) {
      throw new InternalServerErrorException("Failed to create membership");
    }

    await Promise.all([
      db.update(users).set({ role: userRole }).where(eq(users.id, createdUser.id)),
      this.logActivity(teamId, createdUser.id, ActivityType.SIGN_UP),
      writeAuditLog({
        workspaceId: teamId,
        actorUserId: createdUser.id,
        actorRole: userRole,
        action: AuditAction.MEMBER_JOINED,
        entityType: "membership",
        entityId: createdMembership.id,
        source: "server_action",
        metadata: {
          joinedViaInvitation: Boolean(inviteId),
          workspaceName,
        },
      }),
    ]);

    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const token = await signSessionToken({
      user: {
        id: createdUser.id,
      },
      expires,
    });

    return {
      expires,
      role: userRole,
      token,
      user: {
        id: createdUser.id,
      },
    };
  }
}
