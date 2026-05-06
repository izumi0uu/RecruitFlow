import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";

import {
  type AutomationRunMutationResponse,
  automationRunCreateRequestSchema,
  automationRunParamsSchema,
} from "@recruitflow/contracts";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentWorkspaceContext } from "../workspace/current-workspace-context.decorator";
import { RequireWorkspaceRole } from "../workspace/require-workspace-role.decorator";
import { WorkspaceContextGuard } from "../workspace/workspace.guard";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";
import { WorkspaceRoleGuard } from "../workspace/workspace-role.guard";

import { AutomationService } from "./automation.service";

@Controller("automation/runs")
@UseGuards(AuthGuard, WorkspaceContextGuard, WorkspaceRoleGuard)
@RequireWorkspaceRole({ minRole: "recruiter" })
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post()
  createRun(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Body() body: unknown,
  ): Promise<AutomationRunMutationResponse> {
    const parsedBody = automationRunCreateRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid automation payload",
      );
    }

    return this.automationService.createRun(context, parsedBody.data);
  }

  @Post(":automationRunId/retry")
  retryRun(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Param() params: unknown,
  ): Promise<AutomationRunMutationResponse> {
    const parsedParams = automationRunParamsSchema.safeParse(params);

    if (!parsedParams.success) {
      throw new BadRequestException(
        parsedParams.error.issues[0]?.message ?? "Invalid automation run id",
      );
    }

    return this.automationService.retryRun(
      context,
      parsedParams.data.automationRunId,
    );
  }
}
