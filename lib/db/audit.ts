import { db } from "@/lib/db/drizzle";
import {
  auditLogs,
  type AuditAction,
  type AuditEntityType,
  type WorkspaceRole,
} from "@/lib/db/schema";

type AuditEventSource = "ui" | "server_action" | "worker" | "seed";

type WriteAuditLogInput = {
  action: AuditAction;
  actorRole?: WorkspaceRole | null;
  actorUserId: number | null | undefined;
  createdAt?: Date;
  entityId?: number | null;
  entityType?: AuditEntityType | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
  source: AuditEventSource;
  workspaceId: number | null | undefined;
};

export const writeAuditLog = async ({
  action,
  actorRole,
  actorUserId,
  createdAt,
  entityId,
  entityType,
  ipAddress,
  metadata,
  source,
  workspaceId,
}: WriteAuditLogInput) => {
  if (workspaceId == null) {
    return;
  }

  await db.insert(auditLogs).values({
    workspaceId,
    actorUserId: actorUserId ?? null,
    action,
    entityType: entityType ?? null,
    entityId: entityId ?? null,
    metadataJson: {
      source,
      ...(actorRole ? { actorRole } : {}),
      ...(metadata ?? {}),
    },
    ipAddress: ipAddress ?? null,
    createdAt: createdAt ?? undefined,
  });
};
