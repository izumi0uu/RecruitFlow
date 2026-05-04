import { Injectable } from "@nestjs/common";
import { and, desc, eq, type SQL } from "drizzle-orm";

import type {
  SettingsAuditListQuery,
  SettingsAuditListResponse,
} from "@recruitflow/contracts";

import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";

import { auditLogs, users } from "@/lib/db/schema";

@Injectable()
export class AuditService {
  async listWorkspaceAuditLogs(
    context: ApiWorkspaceContext,
    query: SettingsAuditListQuery,
  ): Promise<SettingsAuditListResponse> {
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
}
