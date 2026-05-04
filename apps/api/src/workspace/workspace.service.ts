import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, isNull, ne } from "drizzle-orm";

import type { WorkspaceProfileUpdateRequest } from "@recruitflow/contracts";

import { db } from "../db/database";

import { writeAuditLog } from "@/lib/db/audit";
import {
  AuditAction,
  teamMembers,
  teams,
  users,
  type WorkspaceRole,
} from "@/lib/db/schema";

export type ApiWorkspaceMember = {
  id: string;
  joinedAt: Date | null;
  role: WorkspaceRole;
  user: {
    email: string;
    id: string;
    name: string | null;
  };
  userId: string;
  workspaceId: string;
};

export type ApiWorkspace = {
  createdAt: Date;
  id: string;
  memberships: ApiWorkspaceMember[];
  name: string;
  planName: string | null;
  slug: string | null;
  stripeCustomerId: string | null;
  stripeProductId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  updatedAt: Date;
};

export type ApiCurrentMembership = {
  id: string;
  joinedAt: Date | null;
  role: WorkspaceRole;
  userId: string;
  workspace: Omit<ApiWorkspace, "memberships">;
  workspaceId: string;
};

export type ApiWorkspaceContext = {
  membership: ApiCurrentMembership;
  workspace: ApiWorkspace;
};

const workspaceNotFound = () => new NotFoundException("Workspace not found");

@Injectable()
export class WorkspaceService {
  // Phase 1 has no workspace-switching state yet, so "current" is deterministic:
  // use the earliest active membership for the authenticated user.
  private async getCurrentMembershipRecord(userId: string) {
    const [membership] = await db
      .select({
        joinedAt: teamMembers.joinedAt,
        membershipId: teamMembers.id,
        role: teamMembers.role,
        userId: teamMembers.userId,
        workspaceCreatedAt: teams.createdAt,
        workspaceId: teams.id,
        workspaceName: teams.name,
        workspacePlanName: teams.planName,
        workspaceSlug: teams.slug,
        workspaceStripeCustomerId: teams.stripeCustomerId,
        workspaceStripeProductId: teams.stripeProductId,
        workspaceStripeSubscriptionId: teams.stripeSubscriptionId,
        workspaceSubscriptionStatus: teams.subscriptionStatus,
        workspaceUpdatedAt: teams.updatedAt,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(and(eq(teamMembers.userId, userId), isNull(users.deletedAt)))
      .orderBy(asc(teamMembers.joinedAt), asc(teamMembers.id))
      .limit(1);

    return membership ?? null;
  }

  private async getWorkspaceMembers(
    workspaceId: string,
  ): Promise<ApiWorkspaceMember[]> {
    return db
      .select({
        id: teamMembers.id,
        joinedAt: teamMembers.joinedAt,
        role: teamMembers.role,
        user: {
          email: users.email,
          id: users.id,
          name: users.name,
        },
        userId: teamMembers.userId,
        workspaceId: teamMembers.teamId,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(and(eq(teamMembers.teamId, workspaceId), isNull(users.deletedAt)))
      .orderBy(asc(teamMembers.joinedAt), asc(teamMembers.id));
  }

  private async getCurrentWorkspaceBundle(userId: string) {
    const membership = await this.getCurrentMembershipRecord(userId);

    if (!membership) {
      return null;
    }

    const memberships = await this.getWorkspaceMembers(membership.workspaceId);

    const workspace = {
      createdAt: membership.workspaceCreatedAt,
      id: membership.workspaceId,
      memberships,
      name: membership.workspaceName,
      planName: membership.workspacePlanName,
      slug: membership.workspaceSlug,
      stripeCustomerId: membership.workspaceStripeCustomerId,
      stripeProductId: membership.workspaceStripeProductId,
      stripeSubscriptionId: membership.workspaceStripeSubscriptionId,
      subscriptionStatus: membership.workspaceSubscriptionStatus,
      updatedAt: membership.workspaceUpdatedAt,
    } satisfies ApiWorkspace;

    const currentMembership = {
      id: membership.membershipId,
      joinedAt: membership.joinedAt,
      role: membership.role,
      userId: membership.userId,
      workspace: {
        createdAt: workspace.createdAt,
        id: workspace.id,
        name: workspace.name,
        planName: workspace.planName,
        slug: workspace.slug,
        stripeCustomerId: workspace.stripeCustomerId,
        stripeProductId: workspace.stripeProductId,
        stripeSubscriptionId: workspace.stripeSubscriptionId,
        subscriptionStatus: workspace.subscriptionStatus,
        updatedAt: workspace.updatedAt,
      },
      workspaceId: membership.workspaceId,
    } satisfies ApiCurrentMembership;

    return {
      membership: currentMembership,
      workspace,
    } satisfies ApiWorkspaceContext;
  }

  async getCurrentWorkspace(userId: string) {
    const bundle = await this.getCurrentWorkspaceBundle(userId);

    return bundle?.workspace ?? null;
  }

  async getCurrentMembership(userId: string) {
    const bundle = await this.getCurrentWorkspaceBundle(userId);

    return bundle?.membership ?? null;
  }

  async requireWorkspaceContext(userId: string): Promise<ApiWorkspaceContext> {
    const bundle = await this.getCurrentWorkspaceBundle(userId);

    if (!bundle) {
      throw workspaceNotFound();
    }

    return bundle;
  }

  async updateCurrentWorkspace(
    context: ApiWorkspaceContext,
    input: WorkspaceProfileUpdateRequest,
  ): Promise<ApiWorkspace> {
    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;
    const name = input.name.trim();
    const slug = input.slug.trim().toLowerCase();

    const [existingSlugOwner] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.slug, slug), ne(teams.id, workspaceId)))
      .limit(1);

    if (existingSlugOwner) {
      throw new ConflictException("Workspace slug is already in use");
    }

    await db
      .update(teams)
      .set({
        name,
        slug,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, workspaceId));

    await writeAuditLog({
      workspaceId,
      actorUserId,
      actorRole: context.membership.role,
      action: AuditAction.WORKSPACE_UPDATED,
      entityType: "workspace",
      entityId: workspaceId,
      source: "api",
      metadata: {
        previousName: context.workspace.name,
        previousSlug: context.workspace.slug,
        nextName: name,
        nextSlug: slug,
      },
    });

    const updatedContext = await this.requireWorkspaceContext(actorUserId);

    return updatedContext.workspace;
  }
}

export type WorkspaceRoleRequirement =
  | {
      allowedRoles: WorkspaceRole[];
      minRole?: never;
    }
  | {
      allowedRoles?: never;
      minRole: WorkspaceRole;
    };
