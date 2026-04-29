import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";

import {
  memberInvitationRequestSchema,
  memberRemovalParamsSchema,
  type MemberInvitationResponse,
  type MemberRemovalResponse,
} from "@recruitflow/contracts";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentWorkspaceContext } from "../workspace/current-workspace-context.decorator";
import { RequireWorkspaceRole } from "../workspace/require-workspace-role.decorator";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";
import { WorkspaceContextGuard } from "../workspace/workspace.guard";
import { WorkspaceRoleGuard } from "../workspace/workspace-role.guard";

import { MembersService } from "./members.service";

@Controller("members")
@UseGuards(AuthGuard, WorkspaceContextGuard, WorkspaceRoleGuard)
@RequireWorkspaceRole({ allowedRoles: ["owner"] })
export class MembersController {
  private readonly membersService = new MembersService();

  @Post("invitations")
  async createInvitation(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Body() body: unknown,
  ): Promise<MemberInvitationResponse> {
    const parsedBody = memberInvitationRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid invitation payload",
      );
    }

    return this.membersService.createInvitation(context, parsedBody.data);
  }

  @Delete(":memberId")
  async removeMember(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Param("memberId") memberId: string,
  ): Promise<MemberRemovalResponse> {
    const parsedParams = memberRemovalParamsSchema.safeParse({ memberId });

    if (!parsedParams.success) {
      throw new BadRequestException(
        parsedParams.error.issues[0]?.message ?? "Invalid member id",
      );
    }

    return this.membersService.removeMember(context, parsedParams.data.memberId);
  }
}
