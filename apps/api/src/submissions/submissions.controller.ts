import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";

import {
  submissionsListQuerySchema,
  type SubmissionsModulePlaceholderResponse,
} from "@recruitflow/contracts";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentWorkspaceContext } from "../workspace/current-workspace-context.decorator";
import { RequireWorkspaceRole } from "../workspace/require-workspace-role.decorator";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";
import { WorkspaceContextGuard } from "../workspace/workspace.guard";
import { WorkspaceRoleGuard } from "../workspace/workspace-role.guard";

import { SubmissionsService } from "./submissions.service";

@Controller("submissions")
@UseGuards(AuthGuard, WorkspaceContextGuard, WorkspaceRoleGuard)
@RequireWorkspaceRole({ minRole: "coordinator" })
export class SubmissionsController {
  private readonly submissionsService = new SubmissionsService();

  @Get()
  getSubmissionsModulePlaceholder(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Query() query: unknown,
  ): SubmissionsModulePlaceholderResponse {
    const parsedQuery = submissionsListQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      throw new BadRequestException(
        parsedQuery.error.issues[0]?.message ?? "Invalid submissions query",
      );
    }

    return this.submissionsService.getModulePlaceholder(
      context,
      parsedQuery.data,
    );
  }
}
