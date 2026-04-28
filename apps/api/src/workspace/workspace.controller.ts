import { Controller, Get, UseGuards } from "@nestjs/common";
import type {
  CurrentMembershipResponse,
  CurrentWorkspaceResponse,
  CurrentWorkspaceSummaryResponse,
} from "@recruitflow/contracts";

import { AuthGuard } from "../auth/auth.guard";

import { CurrentWorkspaceContext } from "./current-workspace-context.decorator";
import { RequireWorkspaceRole } from "./require-workspace-role.decorator";
import type {
  ApiCurrentMembership,
  ApiWorkspace,
  ApiWorkspaceContext,
} from "./workspace.service";
import { WorkspaceContextGuard } from "./workspace.guard";
import { WorkspaceRoleGuard } from "./workspace-role.guard";

const toIsoString = (value: Date | null) => value?.toISOString() ?? null;

const toWorkspaceSummaryDto = (
  workspace: Omit<ApiWorkspace, "memberships">,
): CurrentWorkspaceSummaryResponse => ({
  createdAt: workspace.createdAt.toISOString(),
  id: workspace.id,
  name: workspace.name,
  planName: workspace.planName,
  stripeCustomerId: workspace.stripeCustomerId,
  stripeProductId: workspace.stripeProductId,
  stripeSubscriptionId: workspace.stripeSubscriptionId,
  subscriptionStatus: workspace.subscriptionStatus,
  updatedAt: workspace.updatedAt.toISOString(),
});

const toWorkspaceDto = (workspace: ApiWorkspace): CurrentWorkspaceResponse => ({
  ...toWorkspaceSummaryDto(workspace),
  memberships: workspace.memberships.map((membership) => ({
    id: membership.id,
    joinedAt: toIsoString(membership.joinedAt),
    role: membership.role,
    user: membership.user,
    userId: membership.userId,
    workspaceId: membership.workspaceId,
  })),
});

const toMembershipDto = (
  membership: ApiCurrentMembership,
): CurrentMembershipResponse => ({
  id: membership.id,
  joinedAt: toIsoString(membership.joinedAt),
  role: membership.role,
  userId: membership.userId,
  workspace: toWorkspaceSummaryDto(membership.workspace),
  workspaceId: membership.workspaceId,
});

@Controller()
@UseGuards(AuthGuard, WorkspaceContextGuard, WorkspaceRoleGuard)
@RequireWorkspaceRole({ minRole: "coordinator" })
export class WorkspaceController {
  @Get("workspaces/current")
  getCurrentWorkspace(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
  ): CurrentWorkspaceResponse {
    return toWorkspaceDto(context.workspace);
  }

  @Get("memberships/current")
  getCurrentMembership(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
  ): CurrentMembershipResponse {
    return toMembershipDto(context.membership);
  }
}
