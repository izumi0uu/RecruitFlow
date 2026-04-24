import { Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";

import { db } from "../db/database";

import {
  teamMembers,
  teams,
  users,
  type WorkspaceRole,
} from "@/lib/db/schema";

export type ApiWorkspaceMember = {
  id: number;
  joinedAt: Date | null;
  role: WorkspaceRole;
  teamId: number;
  user: {
    email: string;
    id: number;
    name: string | null;
  };
  userId: number;
};

export type ApiWorkspace = {
  createdAt: Date;
  id: number;
  memberships: ApiWorkspaceMember[];
  name: string;
  planName: string | null;
  stripeCustomerId: string | null;
  stripeProductId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  updatedAt: Date;
};

export type ApiCurrentMembership = {
  id: number;
  joinedAt: Date | null;
  role: WorkspaceRole;
  teamId: number;
  userId: number;
  workspace: Omit<ApiWorkspace, "memberships">;
};

export type ApiWorkspaceContext = {
  membership: ApiCurrentMembership;
  workspace: ApiWorkspace;
};

const workspaceNotFound = () => new NotFoundException("Workspace not found");

@Injectable()
export class WorkspaceService {
  private async getCurrentMembershipRecord(userId: number) {
    const [membership] = await db
      .select({
        joinedAt: teamMembers.joinedAt,
        membershipId: teamMembers.id,
        role: teamMembers.role,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        workspaceCreatedAt: teams.createdAt,
        workspaceId: teams.id,
        workspaceName: teams.name,
        workspacePlanName: teams.planName,
        workspaceStripeCustomerId: teams.stripeCustomerId,
        workspaceStripeProductId: teams.stripeProductId,
        workspaceStripeSubscriptionId: teams.stripeSubscriptionId,
        workspaceSubscriptionStatus: teams.subscriptionStatus,
        workspaceUpdatedAt: teams.updatedAt,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId))
      .limit(1);

    return membership ?? null;
  }

  private async getWorkspaceMembers(teamId: number): Promise<ApiWorkspaceMember[]> {
    return db
      .select({
        id: teamMembers.id,
        joinedAt: teamMembers.joinedAt,
        role: teamMembers.role,
        teamId: teamMembers.teamId,
        user: {
          email: users.email,
          id: users.id,
          name: users.name,
        },
        userId: teamMembers.userId,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));
  }

  private async getCurrentWorkspaceBundle(userId: number) {
    const membership = await this.getCurrentMembershipRecord(userId);

    if (!membership) {
      return null;
    }

    const memberships = await this.getWorkspaceMembers(membership.teamId);

    const workspace = {
      createdAt: membership.workspaceCreatedAt,
      id: membership.workspaceId,
      memberships,
      name: membership.workspaceName,
      planName: membership.workspacePlanName,
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
      teamId: membership.teamId,
      userId: membership.userId,
      workspace: {
        createdAt: workspace.createdAt,
        id: workspace.id,
        name: workspace.name,
        planName: workspace.planName,
        stripeCustomerId: workspace.stripeCustomerId,
        stripeProductId: workspace.stripeProductId,
        stripeSubscriptionId: workspace.stripeSubscriptionId,
        subscriptionStatus: workspace.subscriptionStatus,
        updatedAt: workspace.updatedAt,
      },
    } satisfies ApiCurrentMembership;

    return {
      membership: currentMembership,
      workspace,
    } satisfies ApiWorkspaceContext;
  }

  async getCurrentWorkspace(userId: number) {
    const bundle = await this.getCurrentWorkspaceBundle(userId);

    return bundle?.workspace ?? null;
  }

  async getCurrentMembership(userId: number) {
    const bundle = await this.getCurrentWorkspaceBundle(userId);

    return bundle?.membership ?? null;
  }

  async requireWorkspaceContext(userId: number): Promise<ApiWorkspaceContext> {
    const bundle = await this.getCurrentWorkspaceBundle(userId);

    if (!bundle) {
      throw workspaceNotFound();
    }

    return bundle;
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
