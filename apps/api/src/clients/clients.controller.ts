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
  clientContactMutationRequestSchema,
  clientContactParamsSchema,
  clientMutationRequestSchema,
  clientParamsSchema,
  clientsListQuerySchema,
  type ClientArchiveResponse,
  type ClientContactMutationResponse,
  type ClientDetailResponse,
  type ClientMutationResponse,
  type ClientsListResponse,
} from "@recruitflow/contracts";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentWorkspaceContext } from "../workspace/current-workspace-context.decorator";
import { RequireWorkspaceRole } from "../workspace/require-workspace-role.decorator";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";
import { WorkspaceContextGuard } from "../workspace/workspace.guard";
import { WorkspaceRoleGuard } from "../workspace/workspace-role.guard";

import { ClientsService } from "./clients.service";

@Controller("clients")
@UseGuards(AuthGuard, WorkspaceContextGuard, WorkspaceRoleGuard)
@RequireWorkspaceRole({ minRole: "coordinator" })
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  getClientsModulePlaceholder(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Query() query: unknown,
  ): Promise<ClientsListResponse> {
    const parsedQuery = clientsListQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      throw new BadRequestException(
        parsedQuery.error.issues[0]?.message ?? "Invalid clients query",
      );
    }

    return this.clientsService.listClients(context, parsedQuery.data);
  }

  @Get(":clientId")
  getClient(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Param() params: unknown,
  ): Promise<ClientDetailResponse> {
    const parsedParams = clientParamsSchema.safeParse(params);

    if (!parsedParams.success) {
      throw new BadRequestException(
        parsedParams.error.issues[0]?.message ?? "Invalid client id",
      );
    }

    return this.clientsService.getClient(context, parsedParams.data.clientId);
  }

  @Post()
  createClient(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Body() body: unknown,
  ): Promise<ClientMutationResponse> {
    const parsedBody = clientMutationRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid client payload",
      );
    }

    return this.clientsService.createClient(context, parsedBody.data);
  }

  @Patch(":clientId")
  updateClient(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ): Promise<ClientMutationResponse> {
    const parsedParams = clientParamsSchema.safeParse(params);
    const parsedBody = clientMutationRequestSchema.safeParse(body);

    if (!parsedParams.success) {
      throw new BadRequestException(
        parsedParams.error.issues[0]?.message ?? "Invalid client id",
      );
    }

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid client payload",
      );
    }

    return this.clientsService.updateClient(
      context,
      parsedParams.data.clientId,
      parsedBody.data,
    );
  }

  @Patch(":clientId/archive")
  @RequireWorkspaceRole({ allowedRoles: ["owner", "recruiter"] })
  archiveClient(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Param() params: unknown,
  ): Promise<ClientArchiveResponse> {
    const parsedParams = clientParamsSchema.safeParse(params);

    if (!parsedParams.success) {
      throw new BadRequestException(
        parsedParams.error.issues[0]?.message ?? "Invalid client id",
      );
    }

    return this.clientsService.archiveClient(
      context,
      parsedParams.data.clientId,
    );
  }

  @Post(":clientId/contacts")
  createClientContact(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ): Promise<ClientContactMutationResponse> {
    const parsedParams = clientParamsSchema.safeParse(params);
    const parsedBody = clientContactMutationRequestSchema.safeParse(body);

    if (!parsedParams.success) {
      throw new BadRequestException(
        parsedParams.error.issues[0]?.message ?? "Invalid client id",
      );
    }

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid client contact payload",
      );
    }

    return this.clientsService.createClientContact(
      context,
      parsedParams.data.clientId,
      parsedBody.data,
    );
  }

  @Patch(":clientId/contacts/:contactId")
  updateClientContact(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Param() params: unknown,
    @Body() body: unknown,
  ): Promise<ClientContactMutationResponse> {
    const parsedParams = clientContactParamsSchema.safeParse(params);
    const parsedBody = clientContactMutationRequestSchema.safeParse(body);

    if (!parsedParams.success) {
      throw new BadRequestException(
        parsedParams.error.issues[0]?.message ?? "Invalid client contact id",
      );
    }

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid client contact payload",
      );
    }

    return this.clientsService.updateClientContact(
      context,
      parsedParams.data.clientId,
      parsedParams.data.contactId,
      parsedBody.data,
    );
  }
}
