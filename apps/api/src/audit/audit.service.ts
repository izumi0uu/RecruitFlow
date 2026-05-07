import { HttpException, Injectable } from "@nestjs/common";
import type {
  SettingsAuditExportQuery,
  SettingsAuditListQuery,
  SettingsAuditListResponse,
} from "@recruitflow/contracts";
import { and, desc, eq, gte, lt, type SQL } from "drizzle-orm";
import { AuditAction, auditLogs, users } from "@/lib/db/schema";
import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";
import {
  type AuditExportResponse,
  buildAuditExportFilterMetadata,
  buildAuditExportResponse,
} from "./audit-export";

const emptyAuditExportMessage = "No audit events match the current filters.";

const getExclusiveEndDate = (dateString: string) => {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);

  return date;
};

const getInclusiveStartDate = (dateString: string) =>
  new Date(`${dateString}T00:00:00.000Z`);

@Injectable()
export class AuditService {
  private buildWorkspaceAuditFilters(
    context: ApiWorkspaceContext,
    query: SettingsAuditListQuery,
  ) {
    const filters: SQL[] = [eq(auditLogs.workspaceId, context.workspace.id)];

    if (query.action) {
      filters.push(eq(auditLogs.action, query.action));
    }

    if (query.actorUserId) {
      filters.push(eq(auditLogs.actorUserId, query.actorUserId));
    }

    if (query.entityType) {
      filters.push(eq(auditLogs.entityType, query.entityType));
    }

    if (query.startDate) {
      filters.push(
        gte(auditLogs.createdAt, getInclusiveStartDate(query.startDate)),
      );
    }

    if (query.endDate) {
      filters.push(lt(auditLogs.createdAt, getExclusiveEndDate(query.endDate)));
    }

    return filters;
  }

  async listWorkspaceAuditLogs(
    context: ApiWorkspaceContext,
    query: SettingsAuditListQuery,
  ): Promise<SettingsAuditListResponse> {
    const filters = this.buildWorkspaceAuditFilters(context, query);

    const rows = await db
      .select({
        action: auditLogs.action,
        actor: {
          email: users.email,
          id: users.id,
          name: users.name,
        },
        actorUserId: auditLogs.actorUserId,
        createdAt: auditLogs.createdAt,
        entityId: auditLogs.entityId,
        entityType: auditLogs.entityType,
        id: auditLogs.id,
        ipAddress: auditLogs.ipAddress,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorUserId, users.id))
      .where(and(...filters))
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(50);

    return {
      filters: query,
      items: rows.map((row) => ({
        action: row.action,
        actor: row.actor?.id ? row.actor : null,
        actorUserId: row.actorUserId,
        createdAt: row.createdAt.toISOString(),
        entityId: row.entityId,
        entityType: row.entityType,
        id: row.id,
        ipAddress: row.ipAddress,
      })),
    };
  }

  async exportWorkspaceAuditLogs(
    context: ApiWorkspaceContext,
    query: SettingsAuditExportQuery,
  ): Promise<AuditExportResponse> {
    const filters = this.buildWorkspaceAuditFilters(context, query);
    const rows = await db
      .select({
        action: auditLogs.action,
        actorEmail: users.email,
        actorName: users.name,
        actorUserId: auditLogs.actorUserId,
        createdAt: auditLogs.createdAt,
        entityId: auditLogs.entityId,
        entityType: auditLogs.entityType,
        id: auditLogs.id,
        ipAddress: auditLogs.ipAddress,
        metadataJson: auditLogs.metadataJson,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorUserId, users.id))
      .where(and(...filters))
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id));

    if (rows.length === 0) {
      throw new HttpException(
        {
          code: "RESULT_SET_EMPTY",
          error: emptyAuditExportMessage,
        },
        409,
      );
    }

    await db.insert(auditLogs).values({
      action: AuditAction.AUDIT_EXPORT_CREATED,
      actorUserId: context.membership.userId,
      entityType: "audit_log",
      metadataJson: {
        actorRole: context.membership.role,
        filters: buildAuditExportFilterMetadata(query),
        module: "settings",
        rowCount: rows.length,
        source: "api",
        sourceSurface: query.sourceSurface,
      },
      workspaceId: context.workspace.id,
    });

    return buildAuditExportResponse(rows);
  }
}
