import { Controller, Get, UseGuards } from "@nestjs/common";

import type { ApiDashboardOverviewResponse } from "@recruitflow/contracts";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentWorkspaceContext } from "../workspace/current-workspace-context.decorator";
import { RequireWorkspaceRole } from "../workspace/require-workspace-role.decorator";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";
import { WorkspaceContextGuard } from "../workspace/workspace.guard";
import { WorkspaceRoleGuard } from "../workspace/workspace-role.guard";

import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
@UseGuards(AuthGuard, WorkspaceContextGuard, WorkspaceRoleGuard)
@RequireWorkspaceRole({ minRole: "coordinator" })
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("overview")
  getOverview(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
  ): Promise<ApiDashboardOverviewResponse> {
    return this.dashboardService.getOverview(context);
  }
}
