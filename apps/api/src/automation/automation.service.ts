import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  AutomationRunCreateRequest,
  AutomationRunMutationResponse,
  AutomationRunRecord,
  AutomationRunReminderSummary,
  ReminderSuggestionRecord,
} from "@recruitflow/contracts";
import { and, eq, isNull, lt, ne, or, sql } from "drizzle-orm";
import {
  type AutomationRun,
  auditLogs,
  automationRuns,
  candidates,
  clients,
  documents,
  jobs,
  submissions,
  tasks,
  users,
} from "@/lib/db/schema";
import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";

const reminderTargetLimit = 12;

type ReminderSuggestionRow = {
  assignedToEmail: string | null;
  assignedToName: string | null;
  assignedToUserId: string | null;
  dueAt: Date | null;
  entityId: string | null;
  entityType: string | null;
  id: string;
  reason: ReminderSuggestionRecord["reason"];
  title: string;
};

export const toReminderSuggestionForTest = (
  row: ReminderSuggestionRow,
): ReminderSuggestionRecord => ({
  assignedTo:
    row.assignedToUserId && row.assignedToEmail
      ? {
          email: row.assignedToEmail,
          id: row.assignedToUserId,
          name: row.assignedToName,
        }
      : null,
  assignedToUserId: row.assignedToUserId,
  dueAt: row.dueAt?.toISOString() ?? null,
  entityId: row.entityId,
  entityType:
    row.entityType === "client" ||
    row.entityType === "job" ||
    row.entityType === "candidate" ||
    row.entityType === "submission"
      ? row.entityType
      : null,
  id: row.id,
  reason: row.reason,
  suggestedTitle: `[Suggested] ${row.title}`,
  title: row.title,
});

export const buildReminderIdempotencyKeyForTest = (
  workspaceId: string,
  suggestions: ReminderSuggestionRecord[],
) => {
  const targetIds = suggestions.map((suggestion) => suggestion.id).sort();

  return `reminder_generation:${workspaceId}:${targetIds.join(",") || "empty"}`;
};

const serializeAutomationRun = (
  run: AutomationRun,
  reminderSummary: AutomationRunReminderSummary | null = null,
): AutomationRunRecord => ({
  attemptCount: run.attemptCount,
  createdAt: run.createdAt.toISOString(),
  documentId: run.documentId,
  entityId: run.entityId,
  entityType: run.entityType,
  errorMessage: run.errorMessage,
  finishedAt: run.finishedAt?.toISOString() ?? null,
  id: run.id,
  reminderSummary,
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
  private async buildReminderSummary(
    workspaceId: string,
  ): Promise<AutomationRunReminderSummary> {
    const now = new Date();
    const staleThreshold = sql`now() - interval '7 days'`;
    const [overdueTaskRows, snoozedTaskRows, staleSubmissionRows] =
      await Promise.all([
        db
          .select({
            assignedToEmail: users.email,
            assignedToName: users.name,
            assignedToUserId: tasks.assignedToUserId,
            dueAt: tasks.dueAt,
            entityId: tasks.entityId,
            entityType: tasks.entityType,
            id: tasks.id,
            reason: sql<ReminderSuggestionRecord["reason"]>`'overdue_task'`,
            title: tasks.title,
          })
          .from(tasks)
          .leftJoin(users, eq(tasks.assignedToUserId, users.id))
          .where(
            and(
              eq(tasks.workspaceId, workspaceId),
              ne(tasks.status, "done"),
              lt(tasks.dueAt, now),
              or(isNull(tasks.snoozedUntil), lt(tasks.snoozedUntil, now)),
            ),
          )
          .orderBy(tasks.dueAt, tasks.id)
          .limit(reminderTargetLimit),
        db
          .select({
            assignedToEmail: users.email,
            assignedToName: users.name,
            assignedToUserId: tasks.assignedToUserId,
            dueAt: tasks.snoozedUntil,
            entityId: tasks.entityId,
            entityType: tasks.entityType,
            id: tasks.id,
            reason: sql<ReminderSuggestionRecord["reason"]>`'snoozed_task_due'`,
            title: tasks.title,
          })
          .from(tasks)
          .leftJoin(users, eq(tasks.assignedToUserId, users.id))
          .where(
            and(
              eq(tasks.workspaceId, workspaceId),
              eq(tasks.status, "snoozed"),
              lt(tasks.snoozedUntil, now),
            ),
          )
          .orderBy(tasks.snoozedUntil, tasks.id)
          .limit(reminderTargetLimit),
        db
          .select({
            assignedToEmail: users.email,
            assignedToName: users.name,
            assignedToUserId: submissions.ownerUserId,
            dueAt: submissions.lastTouchAt,
            entityId: submissions.id,
            entityType: sql<string>`'submission'`,
            id: submissions.id,
            reason: sql<ReminderSuggestionRecord["reason"]>`'stale_submission'`,
            title: sql<string>`concat('Follow up on ', ${candidates.fullName}, ' for ', ${jobs.title})`,
          })
          .from(submissions)
          .innerJoin(jobs, eq(submissions.jobId, jobs.id))
          .innerJoin(candidates, eq(submissions.candidateId, candidates.id))
          .leftJoin(clients, eq(jobs.clientId, clients.id))
          .leftJoin(users, eq(submissions.ownerUserId, users.id))
          .where(
            and(
              eq(submissions.workspaceId, workspaceId),
              ne(submissions.stage, "placed"),
              ne(submissions.stage, "lost"),
              or(
                lt(submissions.lastTouchAt, staleThreshold),
                and(
                  isNull(submissions.lastTouchAt),
                  lt(submissions.updatedAt, staleThreshold),
                ),
              ),
            ),
          )
          .orderBy(
            submissions.lastTouchAt,
            submissions.updatedAt,
            submissions.id,
          )
          .limit(reminderTargetLimit),
      ]);

    const suggestions = [
      ...overdueTaskRows,
      ...snoozedTaskRows,
      ...staleSubmissionRows,
    ]
      .slice(0, reminderTargetLimit)
      .map(toReminderSuggestionForTest);

    return {
      idempotencyKey: buildReminderIdempotencyKeyForTest(
        workspaceId,
        suggestions,
      ),
      suggestions,
      targetSetSize: suggestions.length,
    };
  }

  async createRun(
    context: ApiWorkspaceContext,
    input: AutomationRunCreateRequest,
  ): Promise<AutomationRunMutationResponse> {
    const workspaceId = context.workspace.id;
    const now = new Date();
    const documentStatusPatch = input.documentId
      ? buildAutomationDocumentStatusPatch(input.type)
      : null;
    const reminderSummary =
      input.type === "reminder_generation"
        ? await this.buildReminderSummary(workspaceId)
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
          reminderIdempotencyKey: reminderSummary?.idempotencyKey ?? null,
          reminderSuggestionCount: reminderSummary?.targetSetSize ?? null,
        },
        createdAt: now,
      }),
    ]);

    return {
      automationRun: serializeAutomationRun(automationRun, reminderSummary),
      contractVersion: "phase-1",
      message:
        input.type === "reminder_generation"
          ? "Reminder suggestions queued. Phase 1 keeps them observable and does not mutate task or submission truth automatically."
          : "Automation run queued. Phase 1 keeps this observable without mutating business truth automatically.",
      reminderSummary,
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
        previousErrorMessage: existingRun.errorMessage,
        previousStatus: existingRun.status,
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
