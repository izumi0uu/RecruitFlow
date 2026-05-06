import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  AutomationRunCreateRequest,
  AutomationRunMutationResponse,
  AutomationRunRecord,
} from "@recruitflow/contracts";
import { and, eq } from "drizzle-orm";
import {
  type AutomationRun,
  auditLogs,
  automationRuns,
  documents,
} from "@/lib/db/schema";
import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";

const serializeAutomationRun = (run: AutomationRun): AutomationRunRecord => ({
  attemptCount: run.attemptCount,
  createdAt: run.createdAt.toISOString(),
  documentId: run.documentId,
  entityId: run.entityId,
  entityType: run.entityType,
  errorMessage: run.errorMessage,
  finishedAt: run.finishedAt?.toISOString() ?? null,
  id: run.id,
  startedAt: run.startedAt?.toISOString() ?? null,
  status: run.status,
  type: run.type,
  updatedAt: run.updatedAt.toISOString(),
});

export const buildAutomationDocumentStatusPatch = (
  type: AutomationRunCreateRequest["type"],
) => {
  switch (type) {
    case "jd_summary":
    case "candidate_summary":
      return { summaryStatus: "queued" as const };
    case "document_indexing":
      return { embeddingStatus: "queued" as const };
    default:
      return null;
  }
};

export const buildAutomationAuditAction = (
  type: AutomationRunCreateRequest["type"],
) => {
  switch (type) {
    case "document_indexing":
      return "EMBEDDING_REQUESTED";
    case "jd_summary":
    case "candidate_summary":
      return "AI_SUMMARY_REQUESTED";
    case "reminder_generation":
      return "REMINDER_GENERATION_REQUESTED";
  }
};

@Injectable()
export class AutomationService {
  async createRun(
    context: ApiWorkspaceContext,
    input: AutomationRunCreateRequest,
  ): Promise<AutomationRunMutationResponse> {
    const workspaceId = context.workspace.id;
    const now = new Date();
    const documentStatusPatch = input.documentId
      ? buildAutomationDocumentStatusPatch(input.type)
      : null;

    if (input.documentId) {
      const [document] = await db
        .select({ id: documents.id })
        .from(documents)
        .where(
          and(
            eq(documents.id, input.documentId),
            eq(documents.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      if (!document) {
        throw new NotFoundException("Document not found in this workspace");
      }
    }

    const [automationRun] = await db
      .insert(automationRuns)
      .values({
        workspaceId,
        type: input.type,
        status: "queued",
        entityType: input.entityType,
        entityId: input.entityId,
        documentId: input.documentId ?? null,
        attemptCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!automationRun) {
      throw new Error("Failed to create automation run");
    }

    await Promise.all([
      documentStatusPatch && input.documentId
        ? db
            .update(documents)
            .set({ ...documentStatusPatch, updatedAt: now })
            .where(
              and(
                eq(documents.id, input.documentId),
                eq(documents.workspaceId, workspaceId),
              ),
            )
        : Promise.resolve(),
      db.insert(auditLogs).values({
        workspaceId,
        actorUserId: context.membership.userId,
        action: buildAutomationAuditAction(input.type),
        entityType: input.entityType,
        entityId: input.entityId,
        metadataJson: {
          automationRunId: automationRun.id,
          automationType: input.type,
          documentId: input.documentId ?? null,
          queue: "phase-1-inline-skeleton",
        },
        createdAt: now,
      }),
    ]);

    return {
      automationRun: serializeAutomationRun(automationRun),
      contractVersion: "phase-1",
      message:
        "Automation run queued. Phase 1 keeps this observable without mutating business truth automatically.",
      workspaceScoped: true,
    };
  }

  async retryRun(
    context: ApiWorkspaceContext,
    automationRunId: string,
  ): Promise<AutomationRunMutationResponse> {
    const workspaceId = context.workspace.id;
    const now = new Date();
    const [existingRun] = await db
      .select()
      .from(automationRuns)
      .where(
        and(
          eq(automationRuns.id, automationRunId),
          eq(automationRuns.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!existingRun) {
      throw new NotFoundException("Automation run not found in this workspace");
    }

    const [automationRun] = await db
      .update(automationRuns)
      .set({
        status: "queued",
        errorMessage: null,
        attemptCount: existingRun.attemptCount + 1,
        startedAt: null,
        finishedAt: null,
        updatedAt: now,
      })
      .where(eq(automationRuns.id, existingRun.id))
      .returning();

    if (!automationRun) {
      throw new Error("Failed to retry automation run");
    }

    await db.insert(auditLogs).values({
      workspaceId,
      actorUserId: context.membership.userId,
      action: buildAutomationAuditAction(automationRun.type),
      entityType: automationRun.entityType,
      entityId: automationRun.entityId,
      metadataJson: {
        automationRunId: automationRun.id,
        automationType: automationRun.type,
        retry: true,
        queue: "phase-1-inline-skeleton",
      },
      createdAt: now,
    });

    return {
      automationRun: serializeAutomationRun(automationRun),
      contractVersion: "phase-1",
      message: "Automation run returned to the queue for retry.",
      workspaceScoped: true,
    };
  }
}
