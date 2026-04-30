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
  jobMutationRequestSchema,
  jobParamsSchema,
  jobsListQuerySchema,
  type JobDetailResponse,
  type JobMutationResponse,
  type JobsListResponse,
} from "@recruitflow/contracts";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentWorkspaceContext } from "../workspace/current-workspace-context.decorator";
import { RequireWorkspaceRole } from "../workspace/require-workspace-role.decorator";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";
import { WorkspaceContextGuard } from "../workspace/workspace.guard";
import { WorkspaceRoleGuard } from "../workspace/workspace-role.guard";

import { JobsService } from "./jobs.service";

@Controller("jobs")
@UseGuards(AuthGuard, WorkspaceContextGuard, WorkspaceRoleGuard)
@RequireWorkspaceRole({ minRole: "coordinator" })
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  getJobs(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Query() query: unknown,
  ): Promise<JobsListResponse> {
    const parsedQuery = jobsListQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      throw new BadRequestException(
        parsedQuery.error.issues[0]?.message ?? "Invalid jobs query",
      );
    }

    return this.jobsService.listJobs(context, parsedQuery.data);
  }

  @Get(":jobId")
  getJob(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Param() params: unknown,
  ): Promise<JobDetailResponse> {
    const parsedParams = jobParamsSchema.safeParse(params);

    if (!parsedParams.success) {
      throw new BadRequestException(
        parsedParams.error.issues[0]?.message ?? "Invalid job id",
      );
    }

    return this.jobsService.getJob(context, parsedParams.data.jobId);
  }

  @Post()
  @RequireWorkspaceRole({ allowedRoles: ["owner", "recruiter"] })
  createJob(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Body() body: unknown,
  ): Promise<JobMutationResponse> {
    const parsedBody = jobMutationRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid job payload",
      );
    }

    return this.jobsService.createJob(context, parsedBody.data);
  }

  @Patch(":jobId")
  @RequireWorkspaceRole({ allowedRoles: ["owner", "recruiter"] })
  updateJob(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ): Promise<JobMutationResponse> {
    const parsedParams = jobParamsSchema.safeParse(params);
    const parsedBody = jobMutationRequestSchema.safeParse(body);

    if (!parsedParams.success) {
      throw new BadRequestException(
        parsedParams.error.issues[0]?.message ?? "Invalid job id",
      );
    }

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid job payload",
      );
    }

    return this.jobsService.updateJob(
      context,
      parsedParams.data.jobId,
      parsedBody.data,
    );
  }
}
