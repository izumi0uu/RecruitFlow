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
  candidateMutationRequestSchema,
  candidateParamsSchema,
  candidatesListQuerySchema,
  type CandidateDetailResponse,
  type CandidateMutationResponse,
  type CandidatesListResponse,
} from "@recruitflow/contracts";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentWorkspaceContext } from "../workspace/current-workspace-context.decorator";
import { RequireWorkspaceRole } from "../workspace/require-workspace-role.decorator";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";
import { WorkspaceContextGuard } from "../workspace/workspace.guard";
import { WorkspaceRoleGuard } from "../workspace/workspace-role.guard";

import { CandidatesService } from "./candidates.service";

@Controller("candidates")
@UseGuards(AuthGuard, WorkspaceContextGuard, WorkspaceRoleGuard)
@RequireWorkspaceRole({ minRole: "coordinator" })
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Get()
  getCandidates(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Query() query: unknown,
  ): Promise<CandidatesListResponse> {
    const parsedQuery = candidatesListQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      throw new BadRequestException(
        parsedQuery.error.issues[0]?.message ?? "Invalid candidates query",
      );
    }

    return this.candidatesService.listCandidates(context, parsedQuery.data);
  }

  @Get(":candidateId")
  getCandidate(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Param() params: unknown,
  ): Promise<CandidateDetailResponse> {
    const parsedParams = candidateParamsSchema.safeParse(params);

    if (!parsedParams.success) {
      throw new BadRequestException(
        parsedParams.error.issues[0]?.message ?? "Invalid candidate id",
      );
    }

    return this.candidatesService.getCandidate(
      context,
      parsedParams.data.candidateId,
    );
  }

  @Post()
  createCandidate(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Body() body: unknown,
  ): Promise<CandidateMutationResponse> {
    const parsedBody = candidateMutationRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid candidate payload",
      );
    }

    return this.candidatesService.createCandidate(context, parsedBody.data);
  }

  @Patch(":candidateId")
  updateCandidate(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ): Promise<CandidateMutationResponse> {
    const parsedParams = candidateParamsSchema.safeParse(params);
    const parsedBody = candidateMutationRequestSchema.safeParse(body);

    if (!parsedParams.success) {
      throw new BadRequestException(
        parsedParams.error.issues[0]?.message ?? "Invalid candidate id",
      );
    }

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid candidate payload",
      );
    }

    return this.candidatesService.updateCandidate(
      context,
      parsedParams.data.candidateId,
      parsedBody.data,
    );
  }
}
