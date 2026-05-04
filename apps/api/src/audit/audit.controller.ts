import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";

import {
  type SettingsAuditListResponse,
  settingsAuditListQuerySchema,
} from "@recruitflow/contracts";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentWorkspaceContext } from "../workspace/current-workspace-context.decorator";
import { RequireWorkspaceRole } from "../workspace/require-workspace-role.decorator";
import { WorkspaceContextGuard } from "../workspace/workspace.guard";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";
import { WorkspaceRoleGuard } from "../workspace/workspace-role.guard";

import { AuditService } from "./audit.service";

const normalizeQuery = (query: Record<string, unknown>) => {
  return Object.fromEntries(
    Object.entries(query).flatMap(([key, value]) => {
      const normalizedValue = Array.isArray(value) ? value[0] : value;

      if (typeof normalizedValue !== "string") {
        return [];
      }

      const trimmedValue = normalizedValue.trim();

      return trimmedValue ? [[key, trimmedValue]] : [];
    }),
  );
};

@Controller("audit")
@UseGuards(AuthGuard, WorkspaceContextGuard, WorkspaceRoleGuard)
@RequireWorkspaceRole({ allowedRoles: ["owner"] })
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get("logs")
  async listWorkspaceAuditLogs(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Query() query: Record<string, unknown>,
  ): Promise<SettingsAuditListResponse> {
    const parsedQuery = settingsAuditListQuerySchema.safeParse(
      normalizeQuery(query),
    );

    if (!parsedQuery.success) {
      throw new BadRequestException(
        parsedQuery.error.issues[0]?.message ?? "Invalid audit filters",
      );
    }

    return this.auditService.listWorkspaceAuditLogs(context, parsedQuery.data);
  }
}
