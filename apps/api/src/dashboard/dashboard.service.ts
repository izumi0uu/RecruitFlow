import { Injectable } from "@nestjs/common";
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
  type SQL,
} from "drizzle-orm";

import {
  apiRiskFlagValues,
  apiSubmissionStageValues,
  type ApiDashboardActivityItem,
  type ApiDashboardKpis,
  type ApiDashboardOutcomeSummary,
  type ApiDashboardOverviewResponse,
  type ApiDashboardPlacementItem,
  type ApiDashboardPulsePoint,
  type ApiDashboardRiskSegment,
  type ApiDashboardSectionResult,
  type ApiDashboardStageDatum,
  type ApiDashboardSubmissionDigestItem,
  type ApiDashboardTaskDigestItem,
  type ApiRiskFlag,
  type ApiSubmissionStage,
} from "@recruitflow/contracts";

import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";

import {
  activityLogs,
  auditLogs,
  candidates,
  clients,
  jobs,
  submissions,
  tasks,
  users,
} from "@/lib/db/schema";

const ACTIVE_JOB_STATUSES = ["intake", "open", "on_hold"] as const;
const ACTIVE_SUBMISSION_STAGES = apiSubmissionStageValues.filter(
  (stage) => stage !== "placed" && stage !== "lost",
) as ApiSubmissionStage[];
const countValue = sql<number>`cast(count(*) as int)`;

const stageShortLabels: Record<ApiSubmissionStage, string> = {
  sourced: "Src",
  screening: "Scr",
  submitted: "Sub",
  client_interview: "Int",
  offer: "Off",
  placed: "Plc",
  lost: "Lst",
};

const stageLabels: Record<ApiSubmissionStage, string> = {
  sourced: "Sourced",
  screening: "Screening",
  submitted: "Submitted",
  client_interview: "Client Interview",
  offer: "Offer",
  placed: "Placed",
  lost: "Lost",
};

const riskLabels: Record<ApiRiskFlag, string> = {
  none: "Healthy",
  timing_risk: "Timing Risk",
  feedback_risk: "Feedback Risk",
  compensation_risk: "Comp Risk",
  fit_risk: "Fit Risk",
};

const riskToneMap: Record<ApiRiskFlag, ApiDashboardRiskSegment["tone"]> = {
  none: "muted",
  timing_risk: "accent",
  feedback_risk: "secondary",
  compensation_risk: "primary",
  fit_risk: "strong",
};

type SubmissionDigestRow = {
  candidateName: string;
  clientName: string;
  id: string;
  jobTitle: string;
  lastTouchAt: Date | null;
  nextStep: string | null;
  ownerName: string | null;
  riskFlag: ApiRiskFlag;
  stage: ApiSubmissionStage;
};

type TaskDigestRow = {
  assigneeName: string | null;
  candidateName: string | null;
  dueAt: Date | null;
  id: string;
  jobTitle: string | null;
  status: ApiDashboardTaskDigestItem["status"];
  title: string;
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

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const humanizeToken = (value: string | null | undefined) => {
  if (!value) return "";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const formatStageLabel = (stage: ApiSubmissionStage) =>
  stageLabels[stage] ?? humanizeToken(stage);

const formatRiskLabel = (risk: ApiRiskFlag) =>
  riskLabels[risk] ?? humanizeToken(risk);

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
    case "CLIENT_RESTORED":
      return "restored a client";
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

const selectCount = async (promise: Promise<Array<{ count: number }>>) => {
  const [result] = await promise;
  return result?.count ?? 0;
};

const requireWhereClause = (whereClause: SQL | undefined) => {
  if (whereClause) {
    return whereClause;
  }

  throw new Error("Dashboard aggregation where clause could not be built");
};

const serializeSubmissionDigestItem = (
  row: SubmissionDigestRow,
): ApiDashboardSubmissionDigestItem => ({
  ...row,
  lastTouchAt: toIsoString(row.lastTouchAt),
});

const serializeTaskDigestItem = (
  row: TaskDigestRow,
): ApiDashboardTaskDigestItem => ({
  ...row,
  dueAt: toIsoString(row.dueAt),
});

@Injectable()
export class DashboardService {
  private async settleSection<T>(
    query: () => Promise<T>,
  ): Promise<ApiDashboardSectionResult<T>> {
    try {
      return {
        status: "fulfilled",
        value: await query(),
      };
    } catch (error) {
      return {
        message:
          error instanceof Error
            ? error.message
            : "Dashboard aggregation failed",
        status: "rejected",
      };
    }
  }

  private async getKpis(workspaceId: string): Promise<ApiDashboardKpis> {
    const [activeClients, openJobs, activeSubmissions, overdueTasks] =
      await Promise.all([
        selectCount(
          db
            .select({ count: countValue })
            .from(clients)
            .where(
              and(
                eq(clients.workspaceId, workspaceId),
                ne(clients.status, "archived"),
                isNull(clients.archivedAt),
              ),
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
                isNull(jobs.archivedAt),
              ),
            ),
        ),
        selectCount(
          db
            .select({ count: countValue })
            .from(submissions)
            .innerJoin(jobs, eq(submissions.jobId, jobs.id))
            .innerJoin(candidates, eq(submissions.candidateId, candidates.id))
            .where(
              and(
                eq(submissions.workspaceId, workspaceId),
                inArray(submissions.stage, ACTIVE_SUBMISSION_STAGES),
                isNull(jobs.archivedAt),
                isNull(candidates.archivedAt),
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
                or(
                  isNull(tasks.snoozedUntil),
                  lte(tasks.snoozedUntil, new Date()),
                ),
              ),
            ),
        ),
      ]);

    return {
      activeClients,
      activeSubmissions,
      openJobs,
      overdueTasks,
    };
  }

  private async getOperationalPulse(
    workspaceId: string,
    days = 7,
  ): Promise<ApiDashboardPulsePoint[]> {
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
      };
    });

    const pointIndex = new Map<string, number>();
    points.forEach((_, index) => {
      const date = addDays(rangeStart, index);
      pointIndex.set(toDateKey(date), index);
    });

    touchRows.forEach((row) => {
      if (!row.touchedAt) return;
      const index = pointIndex.get(toDateKey(row.touchedAt));
      if (index == null) return;
      points[index].submissionTouches += 1;
    });

    followUpRows.forEach((row) => {
      if (!row.dueAt) return;
      const index = pointIndex.get(toDateKey(row.dueAt));
      if (index == null) return;
      points[index].followUps += 1;
    });

    return points;
  }

  private async getStageDistribution(
    workspaceId: string,
  ): Promise<ApiDashboardStageDatum[]> {
    const rows = await db
      .select({
        stage: submissions.stage,
      })
      .from(submissions)
      .innerJoin(jobs, eq(submissions.jobId, jobs.id))
      .innerJoin(candidates, eq(submissions.candidateId, candidates.id))
      .where(
        and(
          eq(submissions.workspaceId, workspaceId),
          isNull(jobs.archivedAt),
          isNull(candidates.archivedAt),
        ),
      );

    const counts = new Map<ApiSubmissionStage, number>();

    rows.forEach((row) => {
      counts.set(row.stage, (counts.get(row.stage) ?? 0) + 1);
    });

    return apiSubmissionStageValues.map((stage) => ({
      count: counts.get(stage) ?? 0,
      label: formatStageLabel(stage),
      shortLabel: stageShortLabels[stage],
      stage,
    }));
  }

  private async getRiskBreakdown(
    workspaceId: string,
  ): Promise<ApiDashboardRiskSegment[]> {
    const rows = await db
      .select({
        riskFlag: submissions.riskFlag,
      })
      .from(submissions)
      .innerJoin(jobs, eq(submissions.jobId, jobs.id))
      .innerJoin(candidates, eq(submissions.candidateId, candidates.id))
      .where(
        and(
          eq(submissions.workspaceId, workspaceId),
          isNull(jobs.archivedAt),
          isNull(candidates.archivedAt),
        ),
      );

    const counts = new Map<ApiRiskFlag, number>();

    rows.forEach((row) => {
      counts.set(row.riskFlag, (counts.get(row.riskFlag) ?? 0) + 1);
    });

    return apiRiskFlagValues
      .map((riskFlag) => ({
        key: riskFlag,
        label: formatRiskLabel(riskFlag),
        tone: riskToneMap[riskFlag],
        value: counts.get(riskFlag) ?? 0,
      }))
      .filter((segment) => segment.value > 0 || segment.key === "none");
  }

  private async selectSubmissionDigest(
    workspaceId: string,
    whereClause: SQL,
    limit: number,
  ): Promise<ApiDashboardSubmissionDigestItem[]> {
    const rows = await db
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
      .where(
        and(
          eq(submissions.workspaceId, workspaceId),
          isNull(jobs.archivedAt),
          isNull(candidates.archivedAt),
          whereClause,
        ),
      )
      .orderBy(desc(submissions.updatedAt))
      .limit(limit);

    return rows.map(serializeSubmissionDigestItem);
  }

  private getAtRiskSubmissions(
    workspaceId: string,
    limit = 4,
  ): Promise<ApiDashboardSubmissionDigestItem[]> {
    return this.selectSubmissionDigest(
      workspaceId,
      requireWhereClause(
        and(
          ne(submissions.riskFlag, "none"),
          inArray(submissions.stage, ACTIVE_SUBMISSION_STAGES),
        ),
      ),
      limit,
    );
  }

  private getStaleSubmissions(
    workspaceId: string,
    limit = 4,
  ): Promise<ApiDashboardSubmissionDigestItem[]> {
    return this.selectSubmissionDigest(
      workspaceId,
      requireWhereClause(
        and(
          inArray(submissions.stage, ACTIVE_SUBMISSION_STAGES),
          isNotNull(submissions.lastTouchAt),
          lt(submissions.lastTouchAt, startOfDay(new Date())),
        ),
      ),
      limit,
    );
  }

  private async selectTaskDigest(
    workspaceId: string,
    whereClause: SQL,
    limit: number,
  ): Promise<ApiDashboardTaskDigestItem[]> {
    const rows = await db
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

    return rows.map(serializeTaskDigestItem);
  }

  private getOverdueTasks(
    workspaceId: string,
    limit = 4,
  ): Promise<ApiDashboardTaskDigestItem[]> {
    return this.selectTaskDigest(
      workspaceId,
      requireWhereClause(
        and(
          ne(tasks.status, "done"),
          lt(tasks.dueAt, new Date()),
          or(isNull(tasks.snoozedUntil), lte(tasks.snoozedUntil, new Date())),
        ),
      ),
      limit,
    );
  }

  private getUserTasks(
    workspaceId: string,
    userId: string,
    limit = 4,
  ): Promise<ApiDashboardTaskDigestItem[]> {
    return this.selectTaskDigest(
      workspaceId,
      requireWhereClause(
        and(
          eq(tasks.assignedToUserId, userId),
          ne(tasks.status, "done"),
          lte(tasks.dueAt, endOfDay(new Date())),
          or(isNull(tasks.snoozedUntil), lte(tasks.snoozedUntil, new Date())),
        ),
      ),
      limit,
    );
  }

  private async getOutcomeSummary(
    workspaceId: string,
  ): Promise<ApiDashboardOutcomeSummary> {
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
          and(
            eq(submissions.workspaceId, workspaceId),
            eq(submissions.stage, "placed"),
            isNull(jobs.archivedAt),
            isNull(candidates.archivedAt),
          ),
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
        .leftJoin(
          submissions,
          and(
            eq(submissions.jobId, jobs.id),
            eq(submissions.workspaceId, workspaceId),
          ),
        )
        .leftJoin(candidates, eq(submissions.candidateId, candidates.id))
        .where(
          and(
            eq(jobs.workspaceId, workspaceId),
            isNull(jobs.archivedAt),
            isNotNull(jobs.openedAt),
            or(isNull(submissions.id), isNull(candidates.archivedAt)),
          ),
        ),
    ]);

    const earliestSubmissionByJob = new Map<
      string,
      { openedAt: Date; submittedAt: Date }
    >();

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

    const durations = Array.from(earliestSubmissionByJob.values()).map(
      (item) => {
        return (
          (item.submittedAt.getTime() - item.openedAt.getTime()) / 86_400_000
        );
      },
    );

    const averageTimeToSubmitDays =
      durations.length > 0
        ? Number(
            (
              durations.reduce((sum, value) => sum + value, 0) /
              durations.length
            ).toFixed(1),
          )
        : null;

    return {
      averageTimeToSubmitDays,
      recentPlacements: recentPlacements
        .filter(
          (placement): placement is typeof placement & { placedAt: Date } =>
            placement.placedAt instanceof Date,
        )
        .map(
          (placement): ApiDashboardPlacementItem => ({
            ...placement,
            placedAt: placement.placedAt.toISOString(),
          }),
        ),
    };
  }

  private async getActivityDigest(
    workspaceId: string,
    limit = 5,
  ): Promise<ApiDashboardActivityItem[]> {
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
        timestamp: row.createdAt.toISOString(),
      })),
      ...activityRows.map((row) => ({
        actionLabel: mapActivityAction(row.action),
        actorName: row.actorName ?? "System",
        href: "/settings/activity",
        id: `activity-${row.id}`,
        source: "activity" as const,
        summary: mapActivityAction(row.action),
        timestamp: row.createdAt.toISOString(),
      })),
    ]
      .sort(
        (left, right) =>
          new Date(right.timestamp).getTime() -
          new Date(left.timestamp).getTime(),
      )
      .slice(0, limit);
  }

  async getOverview(
    context: ApiWorkspaceContext,
  ): Promise<ApiDashboardOverviewResponse> {
    const workspaceId = context.workspace.id;
    const userId = context.membership.userId;

    const [
      kpis,
      operationalPulse,
      stageDistribution,
      riskBreakdown,
      atRiskSubmissions,
      staleSubmissions,
      overdueTasks,
      myTasks,
      outcomeSummary,
      activityDigest,
    ] = await Promise.all([
      this.settleSection(() => this.getKpis(workspaceId)),
      this.settleSection(() => this.getOperationalPulse(workspaceId)),
      this.settleSection(() => this.getStageDistribution(workspaceId)),
      this.settleSection(() => this.getRiskBreakdown(workspaceId)),
      this.settleSection(() => this.getAtRiskSubmissions(workspaceId)),
      this.settleSection(() => this.getStaleSubmissions(workspaceId)),
      this.settleSection(() => this.getOverdueTasks(workspaceId)),
      this.settleSection(() => this.getUserTasks(workspaceId, userId)),
      this.settleSection(() => this.getOutcomeSummary(workspaceId)),
      this.settleSection(() => this.getActivityDigest(workspaceId)),
    ]);

    return {
      contractVersion: "phase-1",
      generatedAt: new Date().toISOString(),
      sections: {
        activityDigest,
        atRiskSubmissions,
        kpis,
        myTasks,
        operationalPulse,
        outcomeSummary,
        overdueTasks,
        riskBreakdown,
        stageDistribution,
        staleSubmissions,
      },
      workspaceScoped: true,
    };
  }
}
