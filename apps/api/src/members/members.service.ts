import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, eq } from "drizzle-orm";

import type {
  MemberInvitationRequest,
  MemberInvitationResponse,
  MemberRemovalResponse,
} from "@recruitflow/contracts";

import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";

import { writeAuditLog } from "@/lib/db/audit";
import {
  AuditAction,
  ActivityType,
  activityLogs,
  invitations,
  teamMembers,
  users,
  type NewActivityLog,
} from "@/lib/db/schema";

@Injectable()
export class MembersService {
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

  async createInvitation(
    context: ApiWorkspaceContext,
    input: MemberInvitationRequest,
  ): Promise<MemberInvitationResponse> {
    const { email, role } = input;
    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;

    const existingMember = await db
      .select({ userId: users.id })
      .from(users)
      .innerJoin(teamMembers, eq(users.id, teamMembers.userId))
      .where(and(eq(users.email, email), eq(teamMembers.teamId, workspaceId)))
      .limit(1);

    if (existingMember.length > 0) {
      throw new ConflictException("User is already a member of this workspace");
    }

    const existingInvitation = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          eq(invitations.teamId, workspaceId),
          eq(invitations.status, "pending"),
        ),
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      throw new ConflictException(
        "An invitation has already been sent to this email",
      );
    }

    const [createdInvitation] = await db
      .insert(invitations)
      .values({
        email,
        invitedBy: actorUserId,
        role,
        status: "pending",
        teamId: workspaceId,
      })
      .returning();

    if (!createdInvitation) {
      throw new NotFoundException("Failed to create invitation");
    }

    await Promise.all([
      this.logActivity(workspaceId, actorUserId, ActivityType.INVITE_TEAM_MEMBER),
      writeAuditLog({
        workspaceId,
        actorUserId,
        actorRole: context.membership.role,
        action: AuditAction.MEMBER_INVITED,
        entityType: "workspace",
        entityId: workspaceId,
        source: "server_action",
        metadata: {
          invitationId: createdInvitation.id,
          invitedEmail: email,
          invitedRole: role,
        },
      }),
    ]);

    return {
      invitation: {
        email: createdInvitation.email,
        id: createdInvitation.id,
        role: createdInvitation.role,
        status: "pending",
        teamId: createdInvitation.teamId,
      },
      message: "Invitation sent successfully",
    };
  }

  async removeMember(
    context: ApiWorkspaceContext,
    memberId: string,
  ): Promise<MemberRemovalResponse> {
    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;
    const [existingMembership] = await db
      .select({
        id: teamMembers.id,
      })
      .from(teamMembers)
      .where(and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, workspaceId)))
      .limit(1);

    if (!existingMembership) {
      throw new NotFoundException("Workspace member not found");
    }

    await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, workspaceId)));

    await Promise.all([
      this.logActivity(workspaceId, actorUserId, ActivityType.REMOVE_TEAM_MEMBER),
      writeAuditLog({
        workspaceId,
        actorUserId,
        actorRole: context.membership.role,
        action: AuditAction.MEMBER_REMOVED,
        entityType: "membership",
        entityId: memberId,
        source: "server_action",
      }),
    ]);

    return {
      memberId,
      message: "Workspace member removed successfully",
      removed: true,
    };
  }
}
