import { Controller, Get, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard";

import { CurrentWorkspaceContext } from "./current-workspace-context.decorator";
import { RequireWorkspaceRole } from "./require-workspace-role.decorator";
import type { ApiWorkspaceContext } from "./workspace.service";
import { WorkspaceContextGuard } from "./workspace.guard";
import { WorkspaceRoleGuard } from "./workspace-role.guard";

const toApiDto = <T>(value: T) => JSON.parse(JSON.stringify(value)) as T;

@Controller()
@UseGuards(AuthGuard, WorkspaceContextGuard, WorkspaceRoleGuard)
@RequireWorkspaceRole({ minRole: "coordinator" })
export class WorkspaceController {
  @Get("workspaces/current")
  getCurrentWorkspace(@CurrentWorkspaceContext() context: ApiWorkspaceContext) {
    return toApiDto(context.workspace);
  }

  @Get("memberships/current")
  getCurrentMembership(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
  ) {
    return toApiDto(context.membership);
  }
}
