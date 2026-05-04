import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import {
  submissionFollowUpUpdateRequestSchema,
  type SubmissionMutationResponse,
  type SubmissionsListResponse,
  submissionMutationRequestSchema,
  submissionParamsSchema,
  submissionStageTransitionRequestSchema,
  submissionsListQuerySchema,
} from "@recruitflow/contracts";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentWorkspaceContext } from "../workspace/current-workspace-context.decorator";
import { RequireWorkspaceRole } from "../workspace/require-workspace-role.decorator";
import { WorkspaceContextGuard } from "../workspace/workspace.guard";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";
import { WorkspaceRoleGuard } from "../workspace/workspace-role.guard";

import { SubmissionsService } from "./submissions.service";

@Controller("submissions")
@UseGuards(AuthGuard, WorkspaceContextGuard, WorkspaceRoleGuard)
@RequireWorkspaceRole({ minRole: "coordinator" })
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  getSubmissions(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Query() query: unknown,
  ): Promise<SubmissionsListResponse> {
    const parsedQuery = submissionsListQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      throw new BadRequestException(
        parsedQuery.error.issues[0]?.message ?? "Invalid submissions query",
      );
    }

    return this.submissionsService.listSubmissions(context, parsedQuery.data);
  }

  @Post()
  createSubmission(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Body() body: unknown,
  ): Promise<SubmissionMutationResponse> {
    const parsedBody = submissionMutationRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid submission payload",
      );
    }

    return this.submissionsService.createSubmission(context, parsedBody.data);
  }

  @Patch(":submissionId/stage")
  updateSubmissionStage(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ): Promise<SubmissionMutationResponse> {
    const parsedParams = submissionParamsSchema.safeParse(params);

    if (!parsedParams.success) {
      throw new BadRequestException(
        parsedParams.error.issues[0]?.message ?? "Invalid submission params",
      );
    }

    const parsedBody = submissionStageTransitionRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ??
          "Invalid stage transition payload",
      );
    }

    return this.submissionsService.updateSubmissionStage(
      context,
      parsedParams.data.submissionId,
      parsedBody.data,
    );
  }

  @Patch(":submissionId/follow-up")
  updateSubmissionFollowUp(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ): Promise<SubmissionMutationResponse> {
    const parsedParams = submissionParamsSchema.safeParse(params);

    if (!parsedParams.success) {
      throw new BadRequestException(
        parsedParams.error.issues[0]?.message ?? "Invalid submission params",
      );
    }

    const parsedBody = submissionFollowUpUpdateRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ??
          "Invalid follow-up update payload",
      );
    }

    return this.submissionsService.updateSubmissionFollowUp(
      context,
      parsedParams.data.submissionId,
      parsedBody.data,
    );
  }
}
