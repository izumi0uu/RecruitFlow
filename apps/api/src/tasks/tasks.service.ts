import { Injectable } from "@nestjs/common";
import type {
  ApiTaskEntityType,
  ApiTaskStatus,
  ApiUserReference,
  TaskEntityReference,
  TaskRecord,
  TaskSubmissionReference,
  TasksListQuery,
  TasksListResponse,
} from "@recruitflow/contracts";
import { apiTaskEntityTypeValues } from "@recruitflow/contracts";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  lt,
  ne,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  candidates,
  clients,
  jobs,
  submissions,
  tasks,
  users,
} from "@/lib/db/schema";
import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";

const assignedUsers = alias(users, "task_assigned_users");
const directClients = alias(clients, "task_direct_clients");
const directJobs = alias(jobs, "task_direct_jobs");
const directJobClients = alias(clients, "task_direct_job_clients");
const directCandidates = alias(candidates, "task_direct_candidates");
const taskSubmissions = alias(submissions, "task_submissions");
const submissionJobs = alias(jobs, "task_submission_jobs");
const submissionClients = alias(clients, "task_submission_clients");
const submissionCandidates = alias(candidates, "task_submission_candidates");

const countValue = sql<number>`cast(count(${tasks.id}) as int)`;

type TaskRecordRow = {
  assignedToEmail: string | null;
  assignedToName: string | null;
  assignedToUserId: string | null;
  completedAt: Date | null;
  createdAt: Date;
  description: string | null;
  directCandidateCompany: string | null;
  directCandidateFullName: string | null;
  directCandidateId: string | null;
  directCandidateTitle: string | null;
  directClientId: string | null;
  directClientIndustry: string | null;
  directClientName: string | null;
  directJobClientName: string | null;
  directJobId: string | null;
  directJobTitle: string | null;
  dueAt: Date | null;
  entityId: string | null;
  entityType: string | null;
  id: string;
  snoozedUntil: Date | null;
  status: ApiTaskStatus;
  submissionCandidateId: string | null;
  submissionCandidateName: string | null;
  submissionClientName: string | null;
  submissionId: string | null;
  submissionJobId: string | null;
  submissionJobTitle: string | null;
  submissionStage: TaskSubmissionReference["stage"] | null;
  title: string;
  updatedAt: Date;
};

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const normalizeTextFilter = (value: string | undefined) => {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
};

const isTaskEntityType = (value: string | null): value is ApiTaskEntityType =>
  apiTaskEntityTypeValues.includes(value as ApiTaskEntityType);

const getOwnerOptions = (context: ApiWorkspaceContext): ApiUserReference[] =>
  context.workspace.memberships.map((membership) => ({
    email: membership.user.email,
    id: membership.user.id,
    name: membership.user.name,
  }));

const getAssignedToReference = (
  row: TaskRecordRow,
): ApiUserReference | null => {
  if (!row.assignedToUserId || !row.assignedToEmail) {
    return null;
  }

  return {
    email: row.assignedToEmail,
    id: row.assignedToUserId,
    name: row.assignedToName,
  };
};

const compactTrail = (items: Array<string | null | undefined>) =>
  items.filter((item): item is string => Boolean(item?.trim()));

const getTaskSubmissionReference = (
  row: TaskRecordRow,
): TaskSubmissionReference | null => {
  if (
    !row.submissionId ||
    !row.submissionCandidateId ||
    !row.submissionCandidateName ||
    !row.submissionJobId ||
    !row.submissionJobTitle ||
    !row.submissionStage
  ) {
    return null;
  }

  return {
    candidateId: row.submissionCandidateId,
    candidateName: row.submissionCandidateName,
    clientName: row.submissionClientName,
    id: row.submissionId,
    jobId: row.submissionJobId,
    jobTitle: row.submissionJobTitle,
    stage: row.submissionStage,
  };
};

const getLinkedEntityReference = (
  row: TaskRecordRow,
  submission: TaskSubmissionReference | null,
): TaskEntityReference | null => {
  if (submission) {
    return {
      id: submission.id,
      label: submission.candidateName,
      secondaryLabel: submission.jobTitle,
      trail: compactTrail([
        "Submission",
        submission.clientName,
        submission.jobTitle,
        submission.candidateName,
      ]),
      type: "submission",
    };
  }

  if (row.directClientId && row.directClientName) {
    return {
      id: row.directClientId,
      label: row.directClientName,
      secondaryLabel: row.directClientIndustry,
      trail: compactTrail(["Client", row.directClientName]),
      type: "client",
    };
  }

  if (row.directJobId && row.directJobTitle) {
    return {
      id: row.directJobId,
      label: row.directJobTitle,
      secondaryLabel: row.directJobClientName,
      trail: compactTrail(["Job", row.directJobClientName, row.directJobTitle]),
      type: "job",
    };
  }

  if (row.directCandidateId && row.directCandidateFullName) {
    const roleContext = compactTrail([
      row.directCandidateTitle,
      row.directCandidateCompany,
    ]).join(" at ");

    return {
      id: row.directCandidateId,
      label: row.directCandidateFullName,
      secondaryLabel: roleContext || null,
      trail: compactTrail(["Candidate", row.directCandidateFullName]),
      type: "candidate",
    };
  }

  return null;
};

const serializeTaskRecord = (row: TaskRecordRow, now: Date): TaskRecord => {
  const submission = getTaskSubmissionReference(row);
  const entityType = isTaskEntityType(row.entityType)
    ? row.entityType
    : submission
      ? "submission"
      : null;

  return {
    assignedTo: getAssignedToReference(row),
    assignedToUserId: row.assignedToUserId,
    completedAt: toIsoString(row.completedAt),
    createdAt: row.createdAt.toISOString(),
    description: row.description,
    dueAt: toIsoString(row.dueAt),
    entityId: row.entityId,
    entityType,
    id: row.id,
    isOverdue: row.status !== "done" && Boolean(row.dueAt && row.dueAt < now),
    linkedEntity: getLinkedEntityReference(row, submission),
    snoozedUntil: toIsoString(row.snoozedUntil),
    status: row.status,
    submission,
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
  };
};

const getTaskOrderBy = (view: TasksListQuery["view"]) => {
  if (view === "done") {
    return [
      sql`${tasks.completedAt} desc nulls last`,
      desc(tasks.updatedAt),
      asc(tasks.id),
    ];
  }

  if (view === "snoozed") {
    return [
      sql`${tasks.snoozedUntil} asc nulls last`,
      sql`${tasks.dueAt} asc nulls last`,
      desc(tasks.updatedAt),
      asc(tasks.id),
    ];
  }

  return [
    sql`case when ${tasks.status} <> 'done' and ${tasks.dueAt} < now() then 0 when ${tasks.status} = 'snoozed' then 2 else 1 end`,
    sql`${tasks.dueAt} asc nulls last`,
    desc(tasks.updatedAt),
    asc(tasks.id),
  ];
};

@Injectable()
export class TasksService {
  async listTasks(
    context: ApiWorkspaceContext,
    query: TasksListQuery,
  ): Promise<TasksListResponse> {
    const workspaceId = context.workspace.id;
    const q = normalizeTextFilter(query.q ?? query.search);
    const assignedToUserId = query.owner ?? query.assignedToUserId ?? null;
    const page = query.page;
    const pageSize = query.pageSize;
    const offset = (page - 1) * pageSize;
    const now = new Date();
    const whereClauses: SQL[] = [eq(tasks.workspaceId, workspaceId)];

    switch (query.view) {
      case "mine":
        whereClauses.push(
          eq(tasks.assignedToUserId, context.membership.userId),
        );
        if (!query.status) {
          whereClauses.push(ne(tasks.status, "done"));
        }
        break;
      case "overdue":
        whereClauses.push(ne(tasks.status, "done"));
        whereClauses.push(lt(tasks.dueAt, now));
        break;
      case "snoozed":
        whereClauses.push(eq(tasks.status, "snoozed"));
        break;
      case "done":
        whereClauses.push(eq(tasks.status, "done"));
        break;
      default:
        if (!query.status) {
          whereClauses.push(ne(tasks.status, "done"));
        }
        break;
    }

    if (assignedToUserId) {
      whereClauses.push(eq(tasks.assignedToUserId, assignedToUserId));
    }

    if (query.status) {
      whereClauses.push(eq(tasks.status, query.status));
    }

    if (query.entityType) {
      whereClauses.push(eq(tasks.entityType, query.entityType));
    }

    if (query.entityId) {
      whereClauses.push(eq(tasks.entityId, query.entityId));
    }

    if (q) {
      const searchPattern = `%${q}%`;
      const searchCondition = or(
        ilike(tasks.title, searchPattern),
        ilike(tasks.description, searchPattern),
        ilike(directClients.name, searchPattern),
        ilike(directJobs.title, searchPattern),
        ilike(directJobClients.name, searchPattern),
        ilike(directCandidates.fullName, searchPattern),
        ilike(submissionCandidates.fullName, searchPattern),
        ilike(submissionJobs.title, searchPattern),
        ilike(submissionClients.name, searchPattern),
      );

      if (searchCondition) {
        whereClauses.push(searchCondition);
      }
    }

    const whereClause = and(...whereClauses);
    const [summaryRow, totalRow] = await Promise.all([
      db
        .select({
          doneCount: sql<number>`cast(count(*) filter (where ${tasks.status} = 'done') as int)`,
          mineCount: sql<number>`cast(count(*) filter (where ${tasks.assignedToUserId} = ${context.membership.userId} and ${tasks.status} <> 'done') as int)`,
          openCount: sql<number>`cast(count(*) filter (where ${tasks.status} = 'open') as int)`,
          overdueCount: sql<number>`cast(count(*) filter (where ${tasks.status} <> 'done' and ${tasks.dueAt} < ${now}) as int)`,
          snoozedCount: sql<number>`cast(count(*) filter (where ${tasks.status} = 'snoozed') as int)`,
          workspaceActiveCount: sql<number>`cast(count(*) filter (where ${tasks.status} <> 'done') as int)`,
        })
        .from(tasks)
        .where(eq(tasks.workspaceId, workspaceId))
        .then((rows) => rows[0]),
      db
        .select({ count: countValue })
        .from(tasks)
        .leftJoin(assignedUsers, eq(tasks.assignedToUserId, assignedUsers.id))
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
          directJobClients,
          eq(directJobs.clientId, directJobClients.id),
        )
        .leftJoin(
          directCandidates,
          and(
            eq(tasks.entityType, "candidate"),
            eq(tasks.entityId, directCandidates.id),
          ),
        )
        .leftJoin(
          taskSubmissions,
          or(
            eq(tasks.submissionId, taskSubmissions.id),
            and(
              eq(tasks.entityType, "submission"),
              eq(tasks.entityId, taskSubmissions.id),
            ),
          ),
        )
        .leftJoin(submissionJobs, eq(taskSubmissions.jobId, submissionJobs.id))
        .leftJoin(
          submissionClients,
          eq(submissionJobs.clientId, submissionClients.id),
        )
        .leftJoin(
          submissionCandidates,
          eq(taskSubmissions.candidateId, submissionCandidates.id),
        )
        .where(whereClause)
        .then((rows) => rows[0]),
    ]);

    const rows = await db
      .select({
        assignedToEmail: assignedUsers.email,
        assignedToName: assignedUsers.name,
        assignedToUserId: tasks.assignedToUserId,
        completedAt: tasks.completedAt,
        createdAt: tasks.createdAt,
        description: tasks.description,
        directCandidateCompany: directCandidates.currentCompany,
        directCandidateFullName: directCandidates.fullName,
        directCandidateId: directCandidates.id,
        directCandidateTitle: directCandidates.currentTitle,
        directClientId: directClients.id,
        directClientIndustry: directClients.industry,
        directClientName: directClients.name,
        directJobClientName: directJobClients.name,
        directJobId: directJobs.id,
        directJobTitle: directJobs.title,
        dueAt: tasks.dueAt,
        entityId: tasks.entityId,
        entityType: tasks.entityType,
        id: tasks.id,
        snoozedUntil: tasks.snoozedUntil,
        status: tasks.status,
        submissionCandidateId: submissionCandidates.id,
        submissionCandidateName: submissionCandidates.fullName,
        submissionClientName: submissionClients.name,
        submissionId: taskSubmissions.id,
        submissionJobId: submissionJobs.id,
        submissionJobTitle: submissionJobs.title,
        submissionStage: taskSubmissions.stage,
        title: tasks.title,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .leftJoin(assignedUsers, eq(tasks.assignedToUserId, assignedUsers.id))
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
      .leftJoin(directJobClients, eq(directJobs.clientId, directJobClients.id))
      .leftJoin(
        directCandidates,
        and(
          eq(tasks.entityType, "candidate"),
          eq(tasks.entityId, directCandidates.id),
        ),
      )
      .leftJoin(
        taskSubmissions,
        or(
          eq(tasks.submissionId, taskSubmissions.id),
          and(
            eq(tasks.entityType, "submission"),
            eq(tasks.entityId, taskSubmissions.id),
          ),
        ),
      )
      .leftJoin(submissionJobs, eq(taskSubmissions.jobId, submissionJobs.id))
      .leftJoin(
        submissionClients,
        eq(submissionJobs.clientId, submissionClients.id),
      )
      .leftJoin(
        submissionCandidates,
        eq(taskSubmissions.candidateId, submissionCandidates.id),
      )
      .where(whereClause)
      .orderBy(...getTaskOrderBy(query.view))
      .limit(pageSize)
      .offset(offset);
    const totalItems = totalRow?.count ?? 0;

    return {
      context: {
        role: context.membership.role,
        workspaceId,
      },
      contractVersion: "phase-1",
      filters: {
        assignedToUserId,
        entityId: query.entityId ?? null,
        entityType: query.entityType ?? null,
        q,
        status: query.status ?? null,
        view: query.view,
      },
      items: rows.map((row) => serializeTaskRecord(row, now)),
      ownerOptions: getOwnerOptions(context),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
      summary: {
        doneCount: summaryRow?.doneCount ?? 0,
        mineCount: summaryRow?.mineCount ?? 0,
        openCount: summaryRow?.openCount ?? 0,
        overdueCount: summaryRow?.overdueCount ?? 0,
        snoozedCount: summaryRow?.snoozedCount ?? 0,
        workspaceActiveCount: summaryRow?.workspaceActiveCount ?? 0,
      },
      workspaceScoped: true,
    };
  }
}
