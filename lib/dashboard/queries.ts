import { cache } from "react";
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import {
  activityLogs,
  auditLogs,
  candidates,
  clients,
  jobs,
  riskFlagValues,
  submissionStageValues,
  submissions,
  tasks,
  users,
  type RiskFlag,
  type SubmissionStage,
  type TaskStatus,
} from "@/lib/db/schema";
import {
  formatRiskLabel,
  formatStageLabel,
  humanizeToken,
} from "@/lib/dashboard/formatters";

const ACTIVE_JOB_STATUSES = ["intake", "open", "on_hold"] as const;
const ACTIVE_SUBMISSION_STAGES = submissionStageValues.filter(
  (stage) => stage !== "placed" && stage !== "lost",
) as SubmissionStage[];
const countValue = sql<number>`cast(count(*) as int)`;

const stageShortLabels: Record<SubmissionStage, string> = {
  sourced: "Src",
  screening: "Scr",
  submitted: "Sub",
  client_interview: "Int",
  offer: "Off",
  placed: "Plc",
  lost: "Lst",
};

const riskToneMap: Record<RiskFlag, "muted" | "primary" | "secondary" | "accent" | "strong"> =
  {
    none: "muted",
    timing_risk: "accent",
    feedback_risk: "secondary",
    compensation_risk: "primary",
    fit_risk: "strong",
  };

export type DashboardKpis = {
  activeClients: number;
  activeSubmissions: number;
  openJobs: number;
  overdueTasks: number;
};

export type DashboardPulsePoint = {
  followUps: number;
  label: string;
  submissionTouches: number;
};

export type DashboardStageDatum = {
  count: number;
  label: string;
  shortLabel: string;
  stage: SubmissionStage;
};

export type DashboardRiskSegment = {
  key: RiskFlag;
  label: string;
  tone: "muted" | "primary" | "secondary" | "accent" | "strong";
  value: number;
};

export type DashboardSubmissionDigestItem = {
  candidateName: string;
  clientName: string;
  id: string;
  jobTitle: string;
  lastTouchAt: Date | null;
  nextStep: string | null;
  ownerName: string | null;
  riskFlag: RiskFlag;
  stage: SubmissionStage;
};

export type DashboardTaskDigestItem = {
  assigneeName: string | null;
  candidateName: string | null;
  dueAt: Date | null;
  id: string;
  jobTitle: string | null;
  status: TaskStatus;
  title: string;
};

export type DashboardPlacementItem = {
  candidateName: string;
  clientName: string;
  id: string;
  jobTitle: string;
  placedAt: Date;
  ownerName: string | null;
};

export type DashboardOutcomeSummary = {
  averageTimeToSubmitDays: number | null;
  recentPlacements: DashboardPlacementItem[];
};

export type DashboardActivityItem = {
  actionLabel: string;
  actorName: string;
  href: string;
  id: string;
  source: "activity" | "audit";
  summary: string;
  timestamp: Date;
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const endOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const toDateKey = (date: Date) => {
  return date.toISOString().slice(0, 10);
};

const buildActivityHref = (entityType: string | null | undefined) => {
  switch (entityType) {
    case "client":
    case "client_contact":
      return "/clients";
    case "job":
      return "/jobs";
    case "candidate":
      return "/candidates";
    case "submission":
      return "/pipeline";
    case "task":
      return "/tasks";
    case "document":
      return "/documents";
    case "workspace":
    case "membership":
      return "/settings";
    default:
      return "/dashboard";
  }
};

const mapAuditAction = (action: string) => {
  switch (action) {
    case "WORKSPACE_CREATED":
      return "created the workspace";
    case "MEMBER_INVITED":
      return "invited a teammate";
    case "MEMBER_JOINED":
      return "joined the workspace";
    case "BILLING_PORTAL_OPENED":
      return "opened the billing portal";
    case "SIGN_IN":
      return "signed in";
    case "SIGN_OUT":
      return "signed out";
    default:
      return humanizeToken(action).toLowerCase();
  }
};

const mapActivityAction = (action: string) => {
  switch (action) {
    case "SIGN_UP":
      return "completed signup";
    case "SIGN_IN":
      return "signed in";
    case "SIGN_OUT":
      return "signed out";
    case "CREATE_TEAM":
      return "created the workspace";
    case "INVITE_TEAM_MEMBER":
      return "sent an invite";
    case "ACCEPT_INVITATION":
      return "accepted an invitation";
    case "REMOVE_TEAM_MEMBER":
      return "removed a teammate";
    case "UPDATE_ACCOUNT":
      return "updated the account";
    case "UPDATE_PASSWORD":
      return "updated the password";
    case "DELETE_ACCOUNT":
      return "deleted the account";
    default:
      return humanizeToken(action).toLowerCase();
  }
};

const selectCount = async (
  promise: Promise<Array<{ count: number }>>,
) => {
  const [result] = await promise;
  return result?.count ?? 0;
};

export const getDashboardKpis = cache(async (workspaceId: string) => {
  const [activeClients, openJobs, activeSubmissions, overdueTasks] =
    await Promise.all([
      selectCount(
        db
          .select({ count: countValue })
          .from(clients)
          .where(
            and(eq(clients.workspaceId, workspaceId), ne(clients.status, "archived")),
          ),
      ),
      selectCount(
        db
          .select({ count: countValue })
          .from(jobs)
          .where(
            and(
              eq(jobs.workspaceId, workspaceId),
              inArray(jobs.status, ACTIVE_JOB_STATUSES),
            ),
          ),
      ),
      selectCount(
        db
          .select({ count: countValue })
          .from(submissions)
          .where(
            and(
              eq(submissions.workspaceId, workspaceId),
              inArray(submissions.stage, ACTIVE_SUBMISSION_STAGES),
            ),
          ),
      ),
      selectCount(
        db
          .select({ count: countValue })
          .from(tasks)
          .where(
            and(
              eq(tasks.workspaceId, workspaceId),
              ne(tasks.status, "done"),
              lt(tasks.dueAt, new Date()),
              or(isNull(tasks.snoozedUntil), lte(tasks.snoozedUntil, new Date())),
            ),
          ),
      ),
    ]);

  return {
    activeClients,
    activeSubmissions,
    openJobs,
    overdueTasks,
  } satisfies DashboardKpis;
});

export const getDashboardOperationalPulse = cache(
  async (workspaceId: string, days = 7) => {
    const today = startOfDay(new Date());
    const rangeStart = addDays(today, -(days - 1));

    const [touchRows, followUpRows] = await Promise.all([
      db
        .select({
          touchedAt: submissions.lastTouchAt,
        })
        .from(submissions)
        .where(
          and(
            eq(submissions.workspaceId, workspaceId),
            isNotNull(submissions.lastTouchAt),
            gte(submissions.lastTouchAt, rangeStart),
          ),
        ),
      db
        .select({
          dueAt: tasks.dueAt,
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.workspaceId, workspaceId),
            isNotNull(tasks.dueAt),
            gte(tasks.dueAt, rangeStart),
          ),
        ),
    ]);

    const points = Array.from({ length: days }, (_, index) => {
      const date = addDays(rangeStart, index);
      return {
        followUps: 0,
        label: new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
        }).format(date),
        submissionTouches: 0,
      } satisfies DashboardPulsePoint;
    });

    const pointIndex = new Map(
      points.map((point, index) => [toDateKey(new Date(`${point.label}, ${today.getFullYear()}`)), index]),
    );

    const saferPointIndex = new Map<string, number>();
    points.forEach((_, index) => {
      const date = addDays(rangeStart, index);
      saferPointIndex.set(toDateKey(date), index);
    });

    touchRows.forEach((row) => {
      if (!row.touchedAt) return;
      const index = saferPointIndex.get(toDateKey(row.touchedAt));
      if (index == null) return;
      points[index].submissionTouches += 1;
    });

    followUpRows.forEach((row) => {
      if (!row.dueAt) return;
      const index = saferPointIndex.get(toDateKey(row.dueAt));
      if (index == null) return;
      points[index].followUps += 1;
    });

    return points;
  },
);

export const getDashboardStageDistribution = cache(async (workspaceId: string) => {
  const rows = await db
    .select({
      stage: submissions.stage,
    })
    .from(submissions)
    .where(eq(submissions.workspaceId, workspaceId));

  const counts = new Map<SubmissionStage, number>();

  rows.forEach((row) => {
    counts.set(row.stage, (counts.get(row.stage) ?? 0) + 1);
  });

  return submissionStageValues.map((stage) => ({
    count: counts.get(stage) ?? 0,
    label: formatStageLabel(stage),
    shortLabel: stageShortLabels[stage],
    stage,
  })) satisfies DashboardStageDatum[];
});

export const getDashboardRiskBreakdown = cache(async (workspaceId: string) => {
  const rows = await db
    .select({
      riskFlag: submissions.riskFlag,
    })
    .from(submissions)
    .where(eq(submissions.workspaceId, workspaceId));

  const counts = new Map<RiskFlag, number>();

  rows.forEach((row) => {
    counts.set(row.riskFlag, (counts.get(row.riskFlag) ?? 0) + 1);
  });

  return riskFlagValues
    .map((riskFlag) => ({
      key: riskFlag,
      label: formatRiskLabel(riskFlag),
      tone: riskToneMap[riskFlag],
      value: counts.get(riskFlag) ?? 0,
    }))
    .filter((segment) => segment.value > 0 || segment.key === "none") satisfies DashboardRiskSegment[];
});

const selectSubmissionDigest = async (
  workspaceId: string,
  whereClause: ReturnType<typeof and>,
  limit: number,
) => {
  return db
    .select({
      candidateName: candidates.fullName,
      clientName: clients.name,
      id: submissions.id,
      jobTitle: jobs.title,
      lastTouchAt: submissions.lastTouchAt,
      nextStep: submissions.nextStep,
      ownerName: users.name,
      riskFlag: submissions.riskFlag,
      stage: submissions.stage,
    })
    .from(submissions)
    .innerJoin(candidates, eq(submissions.candidateId, candidates.id))
    .innerJoin(jobs, eq(submissions.jobId, jobs.id))
    .innerJoin(clients, eq(jobs.clientId, clients.id))
    .leftJoin(users, eq(submissions.ownerUserId, users.id))
    .where(and(eq(submissions.workspaceId, workspaceId), whereClause))
    .orderBy(desc(submissions.updatedAt))
    .limit(limit);
};

export const getDashboardAtRiskSubmissions = cache(
  async (workspaceId: string, limit = 4) => {
    return selectSubmissionDigest(
      workspaceId,
      and(
        ne(submissions.riskFlag, "none"),
        inArray(submissions.stage, ACTIVE_SUBMISSION_STAGES),
      ),
      limit,
    ) satisfies Promise<DashboardSubmissionDigestItem[]>;
  },
);

export const getDashboardStaleSubmissions = cache(
  async (workspaceId: string, limit = 4) => {
    const staleThreshold = startOfDay(new Date());

    return selectSubmissionDigest(
      workspaceId,
      and(
        inArray(submissions.stage, ACTIVE_SUBMISSION_STAGES),
        isNotNull(submissions.lastTouchAt),
        lt(submissions.lastTouchAt, staleThreshold),
      ),
      limit,
    ) satisfies Promise<DashboardSubmissionDigestItem[]>;
  },
);

const selectTaskDigest = async (
  workspaceId: string,
  whereClause: ReturnType<typeof and>,
  limit: number,
) => {
  return db
    .select({
      assigneeName: users.name,
      candidateName: candidates.fullName,
      dueAt: tasks.dueAt,
      id: tasks.id,
      jobTitle: jobs.title,
      status: tasks.status,
      title: tasks.title,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assignedToUserId, users.id))
    .leftJoin(submissions, eq(tasks.submissionId, submissions.id))
    .leftJoin(candidates, eq(submissions.candidateId, candidates.id))
    .leftJoin(jobs, eq(submissions.jobId, jobs.id))
    .where(and(eq(tasks.workspaceId, workspaceId), whereClause))
    .orderBy(tasks.dueAt)
    .limit(limit);
};

export const getDashboardOverdueTasks = cache(
  async (workspaceId: string, limit = 4) => {
    return selectTaskDigest(
      workspaceId,
      and(
        ne(tasks.status, "done"),
        lt(tasks.dueAt, new Date()),
        or(isNull(tasks.snoozedUntil), lte(tasks.snoozedUntil, new Date())),
      ),
      limit,
    ) satisfies Promise<DashboardTaskDigestItem[]>;
  },
);

export const getDashboardUserTasks = cache(
  async (workspaceId: string, userId: string, limit = 4) => {
    return selectTaskDigest(
      workspaceId,
      and(
        eq(tasks.assignedToUserId, userId),
        ne(tasks.status, "done"),
        lte(tasks.dueAt, endOfDay(new Date())),
        or(isNull(tasks.snoozedUntil), lte(tasks.snoozedUntil, new Date())),
      ),
      limit,
    ) satisfies Promise<DashboardTaskDigestItem[]>;
  },
);

export const getDashboardOutcomeSummary = cache(async (workspaceId: string) => {
  const [recentPlacements, timeToSubmitRows] = await Promise.all([
    db
      .select({
        candidateName: candidates.fullName,
        clientName: clients.name,
        id: submissions.id,
        jobTitle: jobs.title,
        ownerName: users.name,
        placedAt: submissions.updatedAt,
      })
      .from(submissions)
      .innerJoin(candidates, eq(submissions.candidateId, candidates.id))
      .innerJoin(jobs, eq(submissions.jobId, jobs.id))
      .innerJoin(clients, eq(jobs.clientId, clients.id))
      .leftJoin(users, eq(submissions.ownerUserId, users.id))
      .where(
        and(eq(submissions.workspaceId, workspaceId), eq(submissions.stage, "placed")),
      )
      .orderBy(desc(submissions.updatedAt))
      .limit(3),
    db
      .select({
        jobId: jobs.id,
        openedAt: jobs.openedAt,
        submittedAt: submissions.submittedAt,
      })
      .from(jobs)
      .leftJoin(submissions, eq(submissions.jobId, jobs.id))
      .where(and(eq(jobs.workspaceId, workspaceId), isNotNull(jobs.openedAt))),
  ]);

  const earliestSubmissionByJob = new Map<string, { openedAt: Date; submittedAt: Date }>();

  timeToSubmitRows.forEach((row) => {
    if (!row.openedAt || !row.submittedAt) {
      return;
    }

    const existing = earliestSubmissionByJob.get(row.jobId);

    if (!existing || row.submittedAt < existing.submittedAt) {
      earliestSubmissionByJob.set(row.jobId, {
        openedAt: row.openedAt,
        submittedAt: row.submittedAt,
      });
    }
  });

  const durations = Array.from(earliestSubmissionByJob.values()).map((item) => {
    return (item.submittedAt.getTime() - item.openedAt.getTime()) / 86_400_000;
  });

  const averageTimeToSubmitDays =
    durations.length > 0
      ? Number(
          (durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(
            1,
          ),
        )
      : null;

  return {
    averageTimeToSubmitDays,
    recentPlacements: recentPlacements.filter(
      (placement): placement is DashboardPlacementItem =>
        placement.placedAt instanceof Date,
    ),
  } satisfies DashboardOutcomeSummary;
});

export const getDashboardActivityDigest = cache(
  async (workspaceId: string, limit = 5) => {
    const [auditRows, activityRows] = await Promise.all([
      db
        .select({
          action: auditLogs.action,
          actorName: users.name,
          createdAt: auditLogs.createdAt,
          entityType: auditLogs.entityType,
          id: auditLogs.id,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.actorUserId, users.id))
        .where(eq(auditLogs.workspaceId, workspaceId))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit),
      db
        .select({
          action: activityLogs.action,
          actorName: users.name,
          createdAt: activityLogs.timestamp,
          id: activityLogs.id,
        })
        .from(activityLogs)
        .leftJoin(users, eq(activityLogs.userId, users.id))
        .where(eq(activityLogs.teamId, workspaceId))
        .orderBy(desc(activityLogs.timestamp))
        .limit(limit),
    ]);

    return [
      ...auditRows.map((row) => ({
        actionLabel: mapAuditAction(row.action),
        actorName: row.actorName ?? "System",
        href: buildActivityHref(row.entityType),
        id: `audit-${row.id}`,
        source: "audit" as const,
        summary: row.entityType
          ? `${mapAuditAction(row.action)} · ${humanizeToken(row.entityType)}`
          : mapAuditAction(row.action),
        timestamp: row.createdAt,
      })),
      ...activityRows.map((row) => ({
        actionLabel: mapActivityAction(row.action),
        actorName: row.actorName ?? "System",
        href: "/settings/activity",
        id: `activity-${row.id}`,
        source: "activity" as const,
        summary: mapActivityAction(row.action),
        timestamp: row.createdAt,
      })),
    ]
      .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
      .slice(0, limit) satisfies DashboardActivityItem[];
  },
);
