import { Injectable } from "@nestjs/common";
import type {
  ApiSubmissionStage,
  ApiTaskEntityType,
  FollowUpItem,
  FollowUpReason,
  FollowUpSeverity,
  FollowUpSourceType,
  FollowUpTodayQuery,
  FollowUpTodayResponse,
  FollowUpTodaySummary,
} from "@recruitflow/contracts";
import {
  apiFollowUpReasonValues,
  apiFollowUpSeverityValues,
  apiFollowUpSourceTypeValues,
  apiSubmissionStageCadenceDefaults,
} from "@recruitflow/contracts";
import { and, asc, eq, inArray, isNull, lte, ne, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  candidates,
  clients,
  jobs,
  reminderSuggestions,
  submissions,
  tasks,
  users,
} from "@/lib/db/schema";
import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";

const directCandidates = alias(candidates, "follow_up_direct_candidates");
const directClients = alias(clients, "follow_up_direct_clients");
const directJobs = alias(jobs, "follow_up_direct_jobs");

const activeCadenceStages = Object.entries(apiSubmissionStageCadenceDefaults)
  .filter(([, cadence]) => cadence.active)
  .map(([stage]) => stage as ApiSubmissionStage);

const dayInMs = 24 * 60 * 60 * 1000;

type FollowUpTaskRow = {
  assignedToName: string | null;
  assignedToUserId: string | null;
  candidateName: string | null;
  clientName: string | null;
  directCandidateName: string | null;
  directClientName: string | null;
  directJobTitle: string | null;
  dueAt: Date | null;
  entityId: string | null;
  entityType: string | null;
  id: string;
  jobTitle: string | null;
  snoozedUntil: Date | null;
  submissionId: string | null;
  title: string;
  updatedAt: Date;
};

type FollowUpSubmissionRow = {
  candidateId: string | null;
  candidateName: string | null;
  clientName: string | null;
  id: string;
  jobId: string | null;
  jobTitle: string | null;
  lastTouchAt: Date | null;
  nextStep: string | null;
  ownerName: string | null;
  ownerUserId: string | null;
  riskFlag: string;
  stage: ApiSubmissionStage;
  submittedAt: Date | null;
  updatedAt: Date;
};

type FollowUpReminderSuggestionRow = {
  acceptedTaskId: string | null;
  candidateName: string | null;
  clientName: string | null;
  createdAt: Date;
  entityId: string | null;
  entityType: string | null;
  id: string;
  jobTitle: string | null;
  proposedAssigneeName: string | null;
  proposedAssigneeUserId: string | null;
  proposedDueAt: Date | null;
  proposedTitle: string;
  reason: string;
  sourceEntityId: string;
  sourceEntityType: string;
  submissionCandidateName: string | null;
  submissionId: string | null;
  submissionJobTitle: string | null;
  updatedAt: Date;
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfDay = (date: Date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );

const subtractDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() - days);
  return nextDate;
};

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const daysBetween = (from: Date | null, to: Date) => {
  if (!from) {
    return null;
  }

  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / dayInMs));
};

const isTaskEntityType = (value: string | null): value is ApiTaskEntityType =>
  value === "client" ||
  value === "job" ||
  value === "candidate" ||
  value === "submission";

const entityHref = (
  entityType: ApiTaskEntityType | null,
  entityId: string | null,
) => {
  if (!entityId) {
    return "/tasks?view=today";
  }

  switch (entityType) {
    case "client":
      return `/clients/${entityId}`;
    case "job":
      return `/jobs/${entityId}`;
    case "candidate":
      return `/candidates/${entityId}`;
    case "submission":
      return `/pipeline?submissionId=${entityId}&view=list`;
    default:
      return "/tasks?view=today";
  }
};

const getTaskEntityContext = (row: FollowUpTaskRow) => {
  const explicitEntityType = isTaskEntityType(row.entityType)
    ? row.entityType
    : null;

  if (explicitEntityType === "client" && row.entityId) {
    return {
      entityId: row.entityId,
      entityLabel: row.directClientName ?? row.title,
      entityType: explicitEntityType,
    };
  }

  if (explicitEntityType === "job" && row.entityId) {
    return {
      entityId: row.entityId,
      entityLabel: row.directJobTitle ?? row.title,
      entityType: explicitEntityType,
    };
  }

  if (explicitEntityType === "candidate" && row.entityId) {
    return {
      entityId: row.entityId,
      entityLabel: row.directCandidateName ?? row.title,
      entityType: explicitEntityType,
    };
  }

  if (row.submissionId) {
    return {
      entityId: row.submissionId,
      entityLabel: row.candidateName ?? row.title,
      entityType: "submission" as const,
    };
  }

  return {
    entityId: row.entityId,
    entityLabel: row.title,
    entityType: explicitEntityType,
  };
};

const getSeverityRank = (severity: FollowUpSeverity) => {
  switch (severity) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "normal":
      return 2;
    case "low":
      return 3;
  }
};

const getReasonRank = (reason: FollowUpReason) => {
  switch (reason) {
    case "task_overdue":
      return 0;
    case "snooze_returned":
      return 1;
    case "high_risk_without_next_step":
      return 2;
    case "cadence_due":
      return 3;
    case "submission_stale":
      return 4;
    case "task_due_today":
      return 5;
    case "suggested_by_automation":
      return 6;
  }
};

const getReasonSeverity = (reason: FollowUpReason): FollowUpSeverity => {
  switch (reason) {
    case "task_overdue":
    case "high_risk_without_next_step":
      return "critical";
    case "snooze_returned":
    case "cadence_due":
      return "high";
    case "submission_stale":
    case "task_due_today":
      return "normal";
    case "suggested_by_automation":
      return "low";
  }
};

const getHighestSeverity = (reasons: FollowUpReason[]) =>
  reasons
    .map(getReasonSeverity)
    .sort((left, right) => getSeverityRank(left) - getSeverityRank(right))[0] ??
  "low";

const createEmptySummary = (): FollowUpTodaySummary => ({
  byReason: Object.fromEntries(
    apiFollowUpReasonValues.map((reason) => [reason, 0]),
  ) as FollowUpTodaySummary["byReason"],
  bySeverity: Object.fromEntries(
    apiFollowUpSeverityValues.map((severity) => [severity, 0]),
  ) as FollowUpTodaySummary["bySeverity"],
  bySource: Object.fromEntries(
    apiFollowUpSourceTypeValues.map((source) => [source, 0]),
  ) as FollowUpTodaySummary["bySource"],
  cadenceDueCount: 0,
  dueTodayTaskCount: 0,
  highRiskCount: 0,
  overdueTaskCount: 0,
  snoozeReturnedCount: 0,
  staleSubmissionCount: 0,
  totalCount: 0,
});

const buildSummary = (items: FollowUpItem[]): FollowUpTodaySummary => {
  const summary = createEmptySummary();

  for (const item of items) {
    summary.totalCount += 1;
    summary.bySource[item.sourceType] += 1;
    summary.bySeverity[item.severity] += 1;

    for (const reason of [item.primaryReason, ...item.secondaryReasons]) {
      summary.byReason[reason] += 1;
    }
  }

  summary.cadenceDueCount = summary.byReason.cadence_due;
  summary.dueTodayTaskCount = summary.byReason.task_due_today;
  summary.highRiskCount = summary.byReason.high_risk_without_next_step;
  summary.overdueTaskCount = summary.byReason.task_overdue;
  summary.snoozeReturnedCount = summary.byReason.snooze_returned;
  summary.staleSubmissionCount = summary.byReason.submission_stale;

  return summary;
};

const getSubmissionSignalDate = (row: FollowUpSubmissionRow) =>
  row.lastTouchAt ?? row.submittedAt ?? row.updatedAt;

const getReminderSuggestionEntityContext = (
  row: FollowUpReminderSuggestionRow,
) => {
  const explicitEntityType = isTaskEntityType(row.entityType)
    ? row.entityType
    : isTaskEntityType(row.sourceEntityType)
      ? row.sourceEntityType
      : null;
  const entityId = row.entityId ?? row.submissionId ?? row.sourceEntityId;

  if (explicitEntityType === "client") {
    return {
      entityId,
      entityLabel: row.clientName ?? row.proposedTitle,
      entityType: explicitEntityType,
    };
  }

  if (explicitEntityType === "job") {
    return {
      entityId,
      entityLabel: row.jobTitle ?? row.proposedTitle,
      entityType: explicitEntityType,
    };
  }

  if (explicitEntityType === "candidate") {
    return {
      entityId,
      entityLabel: row.candidateName ?? row.proposedTitle,
      entityType: explicitEntityType,
    };
  }

  if (explicitEntityType === "submission" || row.submissionId) {
    return {
      entityId,
      entityLabel:
        row.submissionCandidateName ??
        row.submissionJobTitle ??
        row.candidateName ??
        row.proposedTitle,
      entityType: "submission" as const,
    };
  }

  return {
    entityId,
    entityLabel: row.proposedTitle,
    entityType: explicitEntityType,
  };
};

const getSubmissionReasons = (
  row: FollowUpSubmissionRow,
  now: Date,
): FollowUpReason[] => {
  const reasons: FollowUpReason[] = [];
  const cadence = apiSubmissionStageCadenceDefaults[row.stage];
  const signalDate = getSubmissionSignalDate(row);

  if (cadence.active && cadence.days !== null) {
    const staleDays = daysBetween(signalDate, now);

    if (staleDays !== null && staleDays >= cadence.days) {
      reasons.push("cadence_due");

      if (staleDays > cadence.days) {
        reasons.push("submission_stale");
      }
    }
  }

  if (row.riskFlag !== "none" && !row.nextStep?.trim()) {
    reasons.push("high_risk_without_next_step");
  }

  return [...new Set(reasons)].sort(
    (left, right) => getReasonRank(left) - getReasonRank(right),
  );
};

@Injectable()
export class FollowUpService {
  private async getTaskItems(
    context: ApiWorkspaceContext,
    query: FollowUpTodayQuery,
    now: Date,
  ): Promise<FollowUpItem[]> {
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const ownerUserId =
      query.ownerUserId ??
      (query.scope === "mine" ? context.membership.userId : null);
    const ownerClauses = ownerUserId
      ? [eq(tasks.assignedToUserId, ownerUserId)]
      : [];

    const rows = await db
      .select({
        assignedToName: users.name,
        assignedToUserId: tasks.assignedToUserId,
        candidateName: candidates.fullName,
        clientName: clients.name,
        directCandidateName: directCandidates.fullName,
        directClientName: directClients.name,
        directJobTitle: directJobs.title,
        dueAt: tasks.dueAt,
        entityId: tasks.entityId,
        entityType: tasks.entityType,
        id: tasks.id,
        jobTitle: jobs.title,
        snoozedUntil: tasks.snoozedUntil,
        submissionId: submissions.id,
        title: tasks.title,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedToUserId, users.id))
      .leftJoin(
        submissions,
        or(
          eq(tasks.submissionId, submissions.id),
          and(
            eq(tasks.entityType, "submission"),
            eq(tasks.entityId, submissions.id),
          ),
        ),
      )
      .leftJoin(jobs, eq(submissions.jobId, jobs.id))
      .leftJoin(clients, eq(jobs.clientId, clients.id))
      .leftJoin(candidates, eq(submissions.candidateId, candidates.id))
      .leftJoin(
        directClients,
        and(
          eq(tasks.entityType, "client"),
          eq(tasks.entityId, directClients.id),
        ),
      )
      .leftJoin(
        directJobs,
        and(eq(tasks.entityType, "job"), eq(tasks.entityId, directJobs.id)),
      )
      .leftJoin(
        directCandidates,
        and(
          eq(tasks.entityType, "candidate"),
          eq(tasks.entityId, directCandidates.id),
        ),
      )
      .where(
        and(
          eq(tasks.workspaceId, context.workspace.id),
          ne(tasks.status, "done"),
          or(
            and(eq(tasks.status, "open"), lte(tasks.dueAt, todayEnd)),
            and(eq(tasks.status, "snoozed"), lte(tasks.snoozedUntil, todayEnd)),
          ),
          ...ownerClauses,
        ),
      )
      .orderBy(asc(tasks.dueAt), asc(tasks.snoozedUntil), asc(tasks.id))
      .limit(100);

    return rows.map((row): FollowUpItem => {
      const isSnoozeReturned =
        row.snoozedUntil !== null && row.snoozedUntil <= todayEnd;
      const isOverdue = row.dueAt !== null && row.dueAt < todayStart;
      const primaryReason: FollowUpReason = isSnoozeReturned
        ? "snooze_returned"
        : isOverdue
          ? "task_overdue"
          : "task_due_today";
      const contextEntity = getTaskEntityContext(row);
      const href = entityHref(contextEntity.entityType, contextEntity.entityId);
      const sourceType: FollowUpSourceType = isSnoozeReturned
        ? "snoozed_task"
        : "task";

      return {
        dueAt: toIsoString(isSnoozeReturned ? row.snoozedUntil : row.dueAt),
        entityId: contextEntity.entityId,
        entityLabel: contextEntity.entityLabel,
        entityType: contextEntity.entityType,
        id: `${sourceType}:${row.id}`,
        lastTouchAt: toIsoString(row.updatedAt),
        navigationHref: href,
        nextStep: row.title,
        ownerName: row.assignedToName,
        ownerUserId: row.assignedToUserId,
        primaryAction: {
          href,
          label: isSnoozeReturned ? "Resume task" : "Open task context",
          type: isSnoozeReturned ? "resume_snooze" : "open_entity",
        },
        primaryReason,
        secondaryReasons: [],
        severity: getReasonSeverity(primaryReason),
        sourceId: row.id,
        sourceType,
        staleDays: daysBetween(
          isSnoozeReturned ? row.snoozedUntil : row.dueAt,
          now,
        ),
      };
    });
  }

  private async getSubmissionItems(
    context: ApiWorkspaceContext,
    query: FollowUpTodayQuery,
    now: Date,
  ): Promise<FollowUpItem[]> {
    const ownerUserId =
      query.ownerUserId ??
      (query.scope === "mine" ? context.membership.userId : null);
    const ownerClauses = ownerUserId
      ? [eq(submissions.ownerUserId, ownerUserId)]
      : [];
    const oldestActiveCadence = Math.max(
      ...activeCadenceStages.map(
        (stage) => apiSubmissionStageCadenceDefaults[stage].days ?? 0,
      ),
    );
    const staleThreshold = subtractDays(now, oldestActiveCadence);

    const rows = await db
      .select({
        candidateId: candidates.id,
        candidateName: candidates.fullName,
        clientName: clients.name,
        id: submissions.id,
        jobId: jobs.id,
        jobTitle: jobs.title,
        lastTouchAt: submissions.lastTouchAt,
        nextStep: submissions.nextStep,
        ownerName: users.name,
        ownerUserId: submissions.ownerUserId,
        riskFlag: submissions.riskFlag,
        stage: submissions.stage,
        submittedAt: submissions.submittedAt,
        updatedAt: submissions.updatedAt,
      })
      .from(submissions)
      .innerJoin(jobs, eq(submissions.jobId, jobs.id))
      .innerJoin(candidates, eq(submissions.candidateId, candidates.id))
      .leftJoin(clients, eq(jobs.clientId, clients.id))
      .leftJoin(users, eq(submissions.ownerUserId, users.id))
      .where(
        and(
          eq(submissions.workspaceId, context.workspace.id),
          inArray(submissions.stage, activeCadenceStages),
          or(
            ne(submissions.riskFlag, "none"),
            lte(submissions.lastTouchAt, staleThreshold),
            and(
              isNull(submissions.lastTouchAt),
              lte(submissions.updatedAt, staleThreshold),
            ),
          ),
          ...ownerClauses,
        ),
      )
      .orderBy(
        asc(submissions.lastTouchAt),
        asc(submissions.updatedAt),
        asc(submissions.id),
      )
      .limit(100);

    return rows.flatMap((row): FollowUpItem[] => {
      const reasons = getSubmissionReasons(row, now);

      if (reasons.length === 0) {
        return [];
      }

      const sourceType: FollowUpSourceType = reasons.includes(
        "high_risk_without_next_step",
      )
        ? "risk_signal"
        : "stale_submission";
      const primaryReason = reasons[0] ?? "submission_stale";
      const secondaryReasons = reasons.slice(1);
      const signalDate = getSubmissionSignalDate(row);
      const href = entityHref("submission", row.id);

      return [
        {
          dueAt: toIsoString(signalDate),
          entityId: row.id,
          entityLabel: row.candidateName ?? row.jobTitle ?? "Submission",
          entityType: "submission",
          id: `${sourceType}:${row.id}`,
          lastTouchAt: toIsoString(
            row.lastTouchAt ?? row.submittedAt ?? row.updatedAt,
          ),
          navigationHref: href,
          nextStep: row.nextStep,
          ownerName: row.ownerName,
          ownerUserId: row.ownerUserId,
          primaryAction: {
            href,
            label: "Open submission",
            type: "open_entity",
          },
          primaryReason,
          secondaryReasons,
          severity: getHighestSeverity(reasons),
          sourceId: row.id,
          sourceType,
          staleDays: daysBetween(signalDate, now),
        },
      ];
    });
  }

  private async getReminderSuggestionItems(
    context: ApiWorkspaceContext,
    query: FollowUpTodayQuery,
    now: Date,
  ): Promise<FollowUpItem[]> {
    const ownerUserId =
      query.ownerUserId ??
      (query.scope === "mine" ? context.membership.userId : null);
    const ownerClauses = ownerUserId
      ? [eq(reminderSuggestions.proposedAssigneeUserId, ownerUserId)]
      : [];

    const rows = await db
      .select({
        acceptedTaskId: reminderSuggestions.acceptedTaskId,
        candidateName: directCandidates.fullName,
        clientName: directClients.name,
        createdAt: reminderSuggestions.createdAt,
        entityId: reminderSuggestions.entityId,
        entityType: reminderSuggestions.entityType,
        id: reminderSuggestions.id,
        jobTitle: directJobs.title,
        proposedAssigneeName: users.name,
        proposedAssigneeUserId: reminderSuggestions.proposedAssigneeUserId,
        proposedDueAt: reminderSuggestions.proposedDueAt,
        proposedTitle: reminderSuggestions.proposedTitle,
        reason: reminderSuggestions.reason,
        sourceEntityId: reminderSuggestions.sourceEntityId,
        sourceEntityType: reminderSuggestions.sourceEntityType,
        submissionCandidateName: candidates.fullName,
        submissionId: submissions.id,
        submissionJobTitle: jobs.title,
        updatedAt: reminderSuggestions.updatedAt,
      })
      .from(reminderSuggestions)
      .leftJoin(users, eq(reminderSuggestions.proposedAssigneeUserId, users.id))
      .leftJoin(
        submissions,
        or(
          and(
            eq(reminderSuggestions.entityType, "submission"),
            eq(reminderSuggestions.entityId, submissions.id),
          ),
          and(
            eq(reminderSuggestions.sourceEntityType, "submission"),
            eq(reminderSuggestions.sourceEntityId, submissions.id),
          ),
        ),
      )
      .leftJoin(jobs, eq(submissions.jobId, jobs.id))
      .leftJoin(candidates, eq(submissions.candidateId, candidates.id))
      .leftJoin(
        directClients,
        and(
          eq(reminderSuggestions.entityType, "client"),
          eq(reminderSuggestions.entityId, directClients.id),
        ),
      )
      .leftJoin(
        directJobs,
        and(
          eq(reminderSuggestions.entityType, "job"),
          eq(reminderSuggestions.entityId, directJobs.id),
        ),
      )
      .leftJoin(
        directCandidates,
        and(
          eq(reminderSuggestions.entityType, "candidate"),
          eq(reminderSuggestions.entityId, directCandidates.id),
        ),
      )
      .where(
        and(
          eq(reminderSuggestions.workspaceId, context.workspace.id),
          eq(reminderSuggestions.status, "suggested"),
          ...ownerClauses,
        ),
      )
      .orderBy(
        asc(reminderSuggestions.proposedDueAt),
        asc(reminderSuggestions.createdAt),
        asc(reminderSuggestions.id),
      )
      .limit(100);

    return rows.map((row): FollowUpItem => {
      const contextEntity = getReminderSuggestionEntityContext(row);
      const href = entityHref(contextEntity.entityType, contextEntity.entityId);

      return {
        dueAt: toIsoString(row.proposedDueAt),
        entityId: contextEntity.entityId,
        entityLabel: contextEntity.entityLabel,
        entityType: contextEntity.entityType,
        id: `reminder_suggestion:${row.id}`,
        lastTouchAt: toIsoString(row.updatedAt),
        navigationHref: href,
        nextStep: row.proposedTitle.replace(/^\[Suggested\]\s*/, ""),
        ownerName: row.proposedAssigneeName,
        ownerUserId: row.proposedAssigneeUserId,
        primaryAction: {
          href: `/tasks?view=today&suggestionId=${row.id}`,
          label: "Review suggestion",
          type: "review_suggestion",
        },
        primaryReason: "suggested_by_automation",
        secondaryReasons: [],
        severity: getReasonSeverity("suggested_by_automation"),
        sourceId: row.id,
        sourceType: "reminder_suggestion",
        staleDays: daysBetween(row.createdAt, now),
      };
    });
  }

  async getTodayFollowUps(
    context: ApiWorkspaceContext,
    query: FollowUpTodayQuery,
  ): Promise<FollowUpTodayResponse> {
    const now = new Date();
    const page = query.page;
    const pageSize = query.pageSize;
    const [taskItems, submissionItems, reminderSuggestionItems] =
      await Promise.all([
        this.getTaskItems(context, query, now),
        this.getSubmissionItems(context, query, now),
        this.getReminderSuggestionItems(context, query, now),
      ]);
    const allItems = [
      ...taskItems,
      ...submissionItems,
      ...reminderSuggestionItems,
    ].sort((left, right) => {
      const severityDelta =
        getSeverityRank(left.severity) - getSeverityRank(right.severity);

      if (severityDelta !== 0) {
        return severityDelta;
      }

      const reasonDelta =
        getReasonRank(left.primaryReason) - getReasonRank(right.primaryReason);

      if (reasonDelta !== 0) {
        return reasonDelta;
      }

      return (left.dueAt ?? left.lastTouchAt ?? "").localeCompare(
        right.dueAt ?? right.lastTouchAt ?? "",
      );
    });
    const totalItems = allItems.length;
    const offset = (page - 1) * pageSize;

    return {
      contractVersion: "phase-2-daily-followup",
      generatedAt: now.toISOString(),
      items: allItems.slice(offset, offset + pageSize),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
      query: {
        ownerUserId: query.ownerUserId ?? null,
        scope: query.scope,
      },
      summary: buildSummary(allItems),
      workspaceScoped: true,
    };
  }
}
