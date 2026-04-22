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
  actorRole: WorkspaceRole;
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
  if (workspaceId == null || actorUserId == null) {
    return;
  }

  await db.insert(auditLogs).values({
    workspaceId,
    actorUserId,
    action,
    entityType: entityType ?? null,
    entityId: entityId ?? null,
    metadataJson: {
      actorRole,
      source,
      ...(metadata ?? {}),
    },
    ipAddress: ipAddress ?? null,
    createdAt: createdAt ?? undefined,
  });
};
