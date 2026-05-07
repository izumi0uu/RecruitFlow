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
  AuditAction,
  type AutomationRun,
  auditLogs,
  automationRuns,
  candidates,
  clients,
  documents,
  jobs,
  reminderSuggestions,
  type SubmissionStage,
  submissions,
  tasks,
  users,
} from "@/lib/db/schema";
import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";

const reminderTargetLimit = 12;
const oneDayInMilliseconds = 24 * 60 * 60 * 1000;

const submissionStageCadenceDays = {
  sourced: 7,
  screening: 3,
  submitted: 3,
  client_interview: 2,
  offer: 1,
  placed: null,
  lost: null,
} satisfies Record<SubmissionStage, number | null>;

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

type ReminderSuggestionInsertRecord = {
  suggestion: ReminderSuggestionRecord;
  dedupeKey: string;
};

type PersistedReminderSuggestionRow = {
  acceptedTaskId: string | null;
  assignedToEmail: string | null;
  assignedToName: string | null;
  createdAt: Date;
  dismissReason: string | null;
  dismissNote: string | null;
  entityId: string | null;
  entityType: string | null;
  id: string;
  proposedAssigneeUserId: string | null;
  proposedDueAt: Date | null;
  proposedTitle: string;
  reason: string;
  sourceEntityId: string;
  sourceEntityType: string;
  status: "suggested" | "accepted" | "dismissed";
  updatedAt: Date;
};

const isReminderSuggestionReason = (
  value: string,
): value is ReminderSuggestionRecord["reason"] =>
  value === "overdue_task" ||
  value === "snoozed_task_due" ||
  value === "stale_submission";

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
  const targetIds = suggestions
    .map(
      (suggestion) =>
        `${suggestion.reason}:${suggestion.entityType ?? "none"}:${suggestion.id}`,
    )
    .sort();

  return `reminder_generation:${workspaceId}:${targetIds.join(",") || "empty"}`;
};

export const getSubmissionStageCadenceDaysForTest = (stage: SubmissionStage) =>
  submissionStageCadenceDays[stage];

export const buildCadenceDueAtForTest = (
  lastTouchAt: Date | null,
  updatedAt: Date,
  stage: SubmissionStage,
) => {
  const cadenceDays = submissionStageCadenceDays[stage];

  if (cadenceDays == null) {
    return null;
  }

  const anchor = lastTouchAt ?? updatedAt;

  return new Date(anchor.getTime() + cadenceDays * oneDayInMilliseconds);
};

const getReminderSuggestionDedupeKey = (
  workspaceId: string,
  suggestion: ReminderSuggestionRecord,
) =>
  [
    workspaceId,
    suggestion.reason,
    getReminderSuggestionSourceEntityType(suggestion),
    suggestion.id,
    suggestion.dueAt?.slice(0, 10) ?? "no_due_at",
  ].join(":");

const getReminderSuggestionSourceEntityType = (
  suggestion: ReminderSuggestionRecord,
) => {
  if (
    suggestion.reason === "overdue_task" ||
    suggestion.reason === "snoozed_task_due"
  ) {
    return "task";
  }

  return suggestion.entityType ?? "submission";
};

const toPersistedReminderSuggestionRecord = (
  row: PersistedReminderSuggestionRow,
): ReminderSuggestionRecord => ({
  assignedTo:
    row.proposedAssigneeUserId && row.assignedToEmail
      ? {
          email: row.assignedToEmail,
          id: row.proposedAssigneeUserId,
          name: row.assignedToName,
        }
      : null,
  assignedToUserId: row.proposedAssigneeUserId,
  dueAt: row.proposedDueAt?.toISOString() ?? null,
  entityId: row.entityId ?? row.sourceEntityId,
  entityType:
    row.entityType === "client" ||
    row.entityType === "job" ||
    row.entityType === "candidate" ||
    row.entityType === "submission"
      ? row.entityType
      : null,
  id: row.id,
  reason: isReminderSuggestionReason(row.reason)
    ? row.reason
    : "stale_submission",
  suggestedTitle: row.proposedTitle,
  title: row.proposedTitle.replace(/^\[Suggested\]\s*/, ""),
});

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
    const cadenceDueAt = sql<Date>`coalesce(${submissions.lastTouchAt}, ${submissions.updatedAt}) + (
      case ${submissions.stage}
        when 'sourced' then interval '7 days'
        when 'screening' then interval '3 days'
        when 'submitted' then interval '3 days'
        when 'client_interview' then interval '2 days'
        when 'offer' then interval '1 day'
        else null
      end
    )`;
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
            dueAt: cadenceDueAt,
            entityId: submissions.id,
            entityType: sql<string>`'submission'`,
            id: submissions.id,
            reason: sql<ReminderSuggestionRecord["reason"]>`'stale_submission'`,
            stage: submissions.stage,
            title: sql<string>`concat('Follow up on ', ${candidates.fullName}, ' for ', ${jobs.title})`,
            updatedAt: submissions.updatedAt,
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
              lt(cadenceDueAt, now),
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
      ...staleSubmissionRows.map((row) => {
        const cadenceDueAt = buildCadenceDueAtForTest(
          row.dueAt
            ? new Date(
                row.dueAt.getTime() -
                  (submissionStageCadenceDays[row.stage] ?? 0) *
                    oneDayInMilliseconds,
              )
            : null,
          row.updatedAt,
          row.stage,
        );

        return {
          ...row,
          dueAt: cadenceDueAt,
        };
      }),
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

  private async persistReminderSuggestions(
    context: ApiWorkspaceContext,
    automationRun: AutomationRun,
    reminderSummary: AutomationRunReminderSummary | null,
  ): Promise<AutomationRunReminderSummary | null> {
    if (!reminderSummary?.suggestions.length) {
      return reminderSummary;
    }

    const workspaceId = context.workspace.id;
    const now = new Date();
    const suggestionInsertRecords = reminderSummary.suggestions.map(
      (suggestion): ReminderSuggestionInsertRecord => ({
        suggestion,
        dedupeKey: getReminderSuggestionDedupeKey(workspaceId, suggestion),
      }),
    );

    await db
      .insert(reminderSuggestions)
      .values(
        suggestionInsertRecords.map(({ dedupeKey, suggestion }) => ({
          acceptedTaskId: null,
          automationRunId: automationRun.id,
          createdAt: now,
          dedupeKey,
          dismissNote: null,
          dismissReason: null,
          entityId: suggestion.entityId,
          entityType: suggestion.entityType,
          proposedAssigneeUserId: suggestion.assignedToUserId,
          proposedDueAt: suggestion.dueAt ? new Date(suggestion.dueAt) : null,
          proposedTitle: suggestion.suggestedTitle,
          reason: suggestion.reason,
          sourceEntityId: suggestion.id,
          sourceEntityType: getReminderSuggestionSourceEntityType(suggestion),
          sourceSnapshotJson: suggestion,
          status: "suggested" as const,
          updatedAt: now,
          workspaceId,
        })),
      )
      .onConflictDoNothing({
        target: [
          reminderSuggestions.workspaceId,
          reminderSuggestions.dedupeKey,
        ],
      });

    const persistedRows = await db
      .select({
        acceptedTaskId: reminderSuggestions.acceptedTaskId,
        assignedToEmail: users.email,
        assignedToName: users.name,
        createdAt: reminderSuggestions.createdAt,
        dismissNote: reminderSuggestions.dismissNote,
        dismissReason: reminderSuggestions.dismissReason,
        entityId: reminderSuggestions.entityId,
        entityType: reminderSuggestions.entityType,
        id: reminderSuggestions.id,
        proposedAssigneeUserId: reminderSuggestions.proposedAssigneeUserId,
        proposedDueAt: reminderSuggestions.proposedDueAt,
        proposedTitle: reminderSuggestions.proposedTitle,
        reason: reminderSuggestions.reason,
        sourceEntityId: reminderSuggestions.sourceEntityId,
        sourceEntityType: reminderSuggestions.sourceEntityType,
        status: reminderSuggestions.status,
        updatedAt: reminderSuggestions.updatedAt,
      })
      .from(reminderSuggestions)
      .leftJoin(users, eq(reminderSuggestions.proposedAssigneeUserId, users.id))
      .where(
        or(
          ...suggestionInsertRecords.map(({ dedupeKey }) =>
            and(
              eq(reminderSuggestions.workspaceId, workspaceId),
              eq(reminderSuggestions.dedupeKey, dedupeKey),
            ),
          ),
        ),
      )
      .limit(reminderTargetLimit);

    await db.insert(auditLogs).values(
      persistedRows.map((row) => ({
        workspaceId,
        actorUserId: context.membership.userId,
        action: AuditAction.REMINDER_SUGGESTION_PERSISTED,
        entityType: "reminder_suggestion",
        entityId: row.id,
        metadataJson: {
          automationRunId: automationRun.id,
          proposedDueAt: row.proposedDueAt?.toISOString() ?? null,
          reason: row.reason,
          sourceEntityId: row.sourceEntityId,
          sourceEntityType: row.sourceEntityType,
        },
        createdAt: now,
      })),
    );

    const persistedSuggestions = persistedRows.map(
      toPersistedReminderSuggestionRecord,
    );

    return {
      idempotencyKey: buildReminderIdempotencyKeyForTest(
        workspaceId,
        persistedSuggestions,
      ),
      suggestions: persistedSuggestions,
      targetSetSize: persistedSuggestions.length,
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

    const persistedReminderSummary = await this.persistReminderSuggestions(
      context,
      automationRun,
      reminderSummary,
    );

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
          reminderIdempotencyKey:
            persistedReminderSummary?.idempotencyKey ?? null,
          reminderSuggestionCount:
            persistedReminderSummary?.targetSetSize ?? null,
        },
        createdAt: now,
      }),
    ]);

    return {
      automationRun: serializeAutomationRun(
        automationRun,
        persistedReminderSummary,
      ),
      contractVersion: "phase-1",
      message:
        input.type === "reminder_generation"
          ? "Reminder suggestions queued. Phase 1 keeps them observable and does not mutate task or submission truth automatically."
          : "Automation run queued. Phase 1 keeps this observable without mutating business truth automatically.",
      reminderSummary: persistedReminderSummary,
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
