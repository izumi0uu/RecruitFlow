import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ApiTaskEntityType,
  ApiTaskStatus,
  ApiUserReference,
  TaskEntityReference,
  TaskFormEntityOption,
  TaskMutationRequest,
  TaskMutationResponse,
  TaskRecord,
  TaskStatusActionRequest,
  TaskSubmissionReference,
  TasksListQuery,
  TasksListResponse,
  TaskWorkspacePermissions,
} from "@recruitflow/contracts";
import { apiTaskEntityTypeValues } from "@recruitflow/contracts";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  isNull,
  lt,
  ne,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { writeAuditLog } from "@/lib/db/audit";
import {
  AuditAction,
  candidates,
  clients,
  jobs,
  submissions,
  tasks,
  users,
} from "@/lib/db/schema";
import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";

import {
  canCreateTaskForAssignee,
  canEditTask,
  canManageTasks,
  canUpdateTaskStatus,
  getTaskActionPermissions,
} from "./tasks.permissions";

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
  workspaceId: string | null;
};

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const toDateInputValue = (date: string | null) => date?.slice(0, 10) ?? null;

const toTaskDueAt = (value: string) => new Date(`${value}T00:00:00.000Z`);

const toTaskReminderAt = (value: string) => new Date(`${value}T00:00:00.000Z`);

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

const getCurrentUserReference = (
  context: ApiWorkspaceContext,
): ApiUserReference | null => {
  const currentMember = context.workspace.memberships.find(
    (membership) => membership.userId === context.membership.userId,
  );

  if (!currentMember) {
    return null;
  }

  return {
    email: currentMember.user.email,
    id: currentMember.user.id,
    name: currentMember.user.name,
  };
};

const getAssigneeOptions = (context: ApiWorkspaceContext) => {
  if (canManageTasks(context.membership.role)) {
    return getOwnerOptions(context);
  }

  const currentUser = getCurrentUserReference(context);

  return currentUser ? [currentUser] : [];
};

const getTaskWorkspacePermissions = (
  context: ApiWorkspaceContext,
): TaskWorkspacePermissions => ({
  canAssignTasks: canManageTasks(context.membership.role),
  canCreateTask: true,
});

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
  const entityType = isTaskEntityType(row.entityType) ? row.entityType : null;

  if (entityType === "submission" && submission) {
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

  if (entityType === "client" && row.directClientId && row.directClientName) {
    return {
      id: row.directClientId,
      label: row.directClientName,
      secondaryLabel: row.directClientIndustry,
      trail: compactTrail(["Client", row.directClientName]),
      type: "client",
    };
  }

  if (entityType === "job" && row.directJobId && row.directJobTitle) {
    return {
      id: row.directJobId,
      label: row.directJobTitle,
      secondaryLabel: row.directJobClientName,
      trail: compactTrail(["Job", row.directJobClientName, row.directJobTitle]),
      type: "job",
    };
  }

  if (
    entityType === "candidate" &&
    row.directCandidateId &&
    row.directCandidateFullName
  ) {
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

  return null;
};

const serializeTaskRecord = (
  context: ApiWorkspaceContext,
  row: TaskRecordRow,
  now: Date,
): TaskRecord => {
  const submission = getTaskSubmissionReference(row);
  const entityType = isTaskEntityType(row.entityType)
    ? row.entityType
    : submission
      ? "submission"
      : null;
  const actionFlags = getTaskActionPermissions(
    {
      role: context.membership.role,
      userId: context.membership.userId,
    },
    { workspaceId: context.workspace.id },
    {
      assignedToUserId: row.assignedToUserId,
      status: row.status,
      workspaceId: row.workspaceId,
    },
  );

  return {
    assignedTo: getAssignedToReference(row),
    assignedToUserId: row.assignedToUserId,
    ...actionFlags,
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
  private getOwnerOptions(context: ApiWorkspaceContext): ApiUserReference[] {
    return getOwnerOptions(context);
  }

  private resolveAssigneeUserId(
    context: ApiWorkspaceContext,
    assignedToUserId: string,
  ) {
    const assigneeBelongsToWorkspace = context.workspace.memberships.some(
      (membership) => membership.userId === assignedToUserId,
    );

    if (!assigneeBelongsToWorkspace) {
      throw new BadRequestException(
        "Task assignee must be a member of the current workspace",
      );
    }

    return assignedToUserId;
  }

  private async resolveLinkedEntity(
    context: ApiWorkspaceContext,
    input: Pick<TaskMutationRequest, "entityId" | "entityType">,
  ) {
    const workspaceId = context.workspace.id;

    if (input.entityType === "client") {
      const [client] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.entityId),
            eq(clients.workspaceId, workspaceId),
            isNull(clients.archivedAt),
          ),
        )
        .limit(1);

      if (client) {
        return {
          entityId: client.id,
          entityType: input.entityType,
          submissionId: null,
        };
      }
    }

    if (input.entityType === "job") {
      const [job] = await db
        .select({ id: jobs.id })
        .from(jobs)
        .where(
          and(
            eq(jobs.id, input.entityId),
            eq(jobs.workspaceId, workspaceId),
            isNull(jobs.archivedAt),
          ),
        )
        .limit(1);

      if (job) {
        return {
          entityId: job.id,
          entityType: input.entityType,
          submissionId: null,
        };
      }
    }

    if (input.entityType === "candidate") {
      const [candidate] = await db
        .select({ id: candidates.id })
        .from(candidates)
        .where(
          and(
            eq(candidates.id, input.entityId),
            eq(candidates.workspaceId, workspaceId),
            isNull(candidates.archivedAt),
          ),
        )
        .limit(1);

      if (candidate) {
        return {
          entityId: candidate.id,
          entityType: input.entityType,
          submissionId: null,
        };
      }
    }

    if (input.entityType === "submission") {
      const [submission] = await db
        .select({ id: submissions.id })
        .from(submissions)
        .where(
          and(
            eq(submissions.id, input.entityId),
            eq(submissions.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      if (submission) {
        return {
          entityId: submission.id,
          entityType: input.entityType,
          submissionId: submission.id,
        };
      }
    }

    throw new BadRequestException(
      "Task linked entity must belong to the current workspace",
    );
  }

  private async getEntityOptions(
    context: ApiWorkspaceContext,
  ): Promise<TaskFormEntityOption[]> {
    const workspaceId = context.workspace.id;
    const [clientRows, submissionRows] = await Promise.all([
      db
        .select({
          id: clients.id,
          industry: clients.industry,
          name: clients.name,
        })
        .from(clients)
        .where(
          and(eq(clients.workspaceId, workspaceId), isNull(clients.archivedAt)),
        )
        .orderBy(asc(clients.name), asc(clients.id))
        .limit(100),
      db
        .select({
          candidateName: candidates.fullName,
          clientName: clients.name,
          id: submissions.id,
          jobTitle: jobs.title,
          stage: submissions.stage,
        })
        .from(submissions)
        .innerJoin(jobs, eq(submissions.jobId, jobs.id))
        .innerJoin(candidates, eq(submissions.candidateId, candidates.id))
        .leftJoin(clients, eq(jobs.clientId, clients.id))
        .where(eq(submissions.workspaceId, workspaceId))
        .orderBy(asc(candidates.fullName), asc(jobs.title), asc(submissions.id))
        .limit(100),
    ]);

    return [
      ...clientRows.map(
        (client): TaskFormEntityOption => ({
          entityId: client.id,
          entityType: "client",
          label: client.name,
          secondaryLabel: client.industry,
          trail: compactTrail(["Client", client.name]),
        }),
      ),
      ...submissionRows.map(
        (submission): TaskFormEntityOption => ({
          entityId: submission.id,
          entityType: "submission",
          label: submission.candidateName,
          secondaryLabel: compactTrail([
            submission.clientName,
            submission.jobTitle,
            submission.stage,
          ]).join(" / "),
          trail: compactTrail([
            "Submission",
            submission.clientName,
            submission.jobTitle,
            submission.candidateName,
          ]),
        }),
      ),
    ];
  }

  private async selectTaskRecord(
    context: ApiWorkspaceContext,
    taskId: string,
  ): Promise<TaskRecord> {
    const [row] = await db
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
        workspaceId: tasks.workspaceId,
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
      .where(
        and(eq(tasks.workspaceId, context.workspace.id), eq(tasks.id, taskId)),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException("Task not found");
    }

    return serializeTaskRecord(context, row, new Date());
  }

  private async buildMutationResponse(
    context: ApiWorkspaceContext,
    taskId: string,
    message: string,
  ): Promise<TaskMutationResponse> {
    const [task, entityOptions] = await Promise.all([
      this.selectTaskRecord(context, taskId),
      this.getEntityOptions(context),
    ]);

    return {
      assigneeOptions: getAssigneeOptions(context),
      context: {
        role: context.membership.role,
        workspaceId: context.workspace.id,
      },
      contractVersion: "phase-1",
      entityOptions,
      message,
      ownerOptions: this.getOwnerOptions(context),
      permissions: getTaskWorkspacePermissions(context),
      task,
      workspaceScoped: true,
    };
  }

  private async writeTaskPermissionDeniedAudit(
    context: ApiWorkspaceContext,
    input: {
      assignedToUserId?: string | null;
      attemptedAction: string;
      reason: string;
      taskId?: string | null;
    },
  ) {
    await writeAuditLog({
      action: AuditAction.TASK_PERMISSION_DENIED,
      actorRole: context.membership.role,
      actorUserId: context.membership.userId,
      entityId: input.taskId ?? null,
      entityType: "task",
      metadata: {
        assignedToUserId: input.assignedToUserId ?? null,
        attemptedAction: input.attemptedAction,
        reason: input.reason,
      },
      source: "api",
      workspaceId: context.workspace.id,
    });
  }

  private async assertCanCreateTask(
    context: ApiWorkspaceContext,
    assignedToUserId: string,
  ) {
    if (
      canCreateTaskForAssignee(
        {
          role: context.membership.role,
          userId: context.membership.userId,
        },
        assignedToUserId,
      )
    ) {
      return;
    }

    const reason = "coordinator_assignee_scope";

    await this.writeTaskPermissionDeniedAudit(context, {
      assignedToUserId,
      attemptedAction: "create",
      reason,
    });

    throw new ForbiddenException(
      "Coordinators can create only tasks assigned to themselves",
    );
  }

  private async assertCanEditTask(
    context: ApiWorkspaceContext,
    task: TaskRecord,
  ) {
    if (
      canEditTask({
        role: context.membership.role,
        userId: context.membership.userId,
      })
    ) {
      return;
    }

    const reason = "coordinator_edit_scope";

    await this.writeTaskPermissionDeniedAudit(context, {
      assignedToUserId: task.assignedToUserId,
      attemptedAction: "edit",
      reason,
      taskId: task.id,
    });

    throw new ForbiddenException(
      "Only owner and recruiter roles can edit tasks",
    );
  }

  private async assertCanUpdateTaskStatus(
    context: ApiWorkspaceContext,
    task: TaskRecord,
    action: TaskStatusActionRequest["action"],
  ) {
    if (
      canUpdateTaskStatus(
        {
          role: context.membership.role,
          userId: context.membership.userId,
        },
        { assignedToUserId: task.assignedToUserId },
      )
    ) {
      return;
    }

    const reason = "coordinator_status_scope";

    await this.writeTaskPermissionDeniedAudit(context, {
      assignedToUserId: task.assignedToUserId,
      attemptedAction: action,
      reason,
      taskId: task.id,
    });

    throw new ForbiddenException(
      "Coordinators can update only tasks assigned to them",
    );
  }

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
        whereClauses.push(lt(tasks.dueAt, sql`now()`));
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
    const [summaryRow, totalRow, entityOptions] = await Promise.all([
      db
        .select({
          doneCount: sql<number>`cast(count(*) filter (where ${tasks.status} = 'done') as int)`,
          mineCount: sql<number>`cast(count(*) filter (where ${tasks.assignedToUserId} = ${context.membership.userId} and ${tasks.status} <> 'done') as int)`,
          openCount: sql<number>`cast(count(*) filter (where ${tasks.status} = 'open') as int)`,
          overdueCount: sql<number>`cast(count(*) filter (where ${tasks.status} <> 'done' and ${tasks.dueAt} < now()) as int)`,
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
      this.getEntityOptions(context),
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
        workspaceId: tasks.workspaceId,
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
      assigneeOptions: getAssigneeOptions(context),
      context: {
        role: context.membership.role,
        workspaceId,
      },
      contractVersion: "phase-1",
      entityOptions,
      filters: {
        assignedToUserId,
        entityId: query.entityId ?? null,
        entityType: query.entityType ?? null,
        q,
        status: query.status ?? null,
        view: query.view,
      },
      items: rows.map((row) => serializeTaskRecord(context, row, now)),
      ownerOptions: getOwnerOptions(context),
      permissions: getTaskWorkspacePermissions(context),
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

  async createTask(
    context: ApiWorkspaceContext,
    input: TaskMutationRequest,
  ): Promise<TaskMutationResponse> {
    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;
    const assignedToUserId = this.resolveAssigneeUserId(
      context,
      input.assignedToUserId,
    );
    await this.assertCanCreateTask(context, assignedToUserId);

    const linkedEntity = await this.resolveLinkedEntity(context, input);
    const now = new Date();
    const [task] = await db
      .insert(tasks)
      .values({
        assignedToUserId,
        createdAt: now,
        createdByUserId: actorUserId,
        description: input.description ?? null,
        dueAt: toTaskDueAt(input.dueAt),
        entityId: linkedEntity.entityId,
        entityType: linkedEntity.entityType,
        status: "open",
        submissionId: linkedEntity.submissionId,
        title: input.title,
        updatedAt: now,
        workspaceId,
      })
      .returning({ id: tasks.id });

    if (!task) {
      throw new NotFoundException("Failed to create task");
    }

    await writeAuditLog({
      action: AuditAction.TASK_CREATED,
      actorRole: context.membership.role,
      actorUserId,
      entityId: task.id,
      entityType: "task",
      metadata: {
        assignedToUserId,
        linkedEntityId: linkedEntity.entityId,
        linkedEntityType: linkedEntity.entityType,
      },
      source: "api",
      workspaceId,
    });

    return this.buildMutationResponse(context, task.id, "Task created");
  }

  async updateTask(
    context: ApiWorkspaceContext,
    taskId: string,
    input: TaskMutationRequest,
  ): Promise<TaskMutationResponse> {
    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;
    const existingTask = await this.selectTaskRecord(context, taskId);
    await this.assertCanEditTask(context, existingTask);

    const assignedToUserId = this.resolveAssigneeUserId(
      context,
      input.assignedToUserId,
    );
    const linkedEntity = await this.resolveLinkedEntity(context, input);
    const now = new Date();
    const nextDueDate = input.dueAt;
    const changedFields = [
      existingTask.title !== input.title ? "title" : null,
      existingTask.description !== (input.description ?? null)
        ? "description"
        : null,
      existingTask.assignedToUserId !== assignedToUserId
        ? "assignedToUserId"
        : null,
      toDateInputValue(existingTask.dueAt) !== nextDueDate ? "dueAt" : null,
      existingTask.entityType !== linkedEntity.entityType ? "entityType" : null,
      existingTask.entityId !== linkedEntity.entityId ? "entityId" : null,
    ].filter((field): field is string => Boolean(field));

    const [task] = await db
      .update(tasks)
      .set({
        assignedToUserId,
        description: input.description ?? null,
        dueAt: toTaskDueAt(input.dueAt),
        entityId: linkedEntity.entityId,
        entityType: linkedEntity.entityType,
        submissionId: linkedEntity.submissionId,
        title: input.title,
        updatedAt: now,
      })
      .where(and(eq(tasks.workspaceId, workspaceId), eq(tasks.id, taskId)))
      .returning({ id: tasks.id });

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    await writeAuditLog({
      action: AuditAction.TASK_UPDATED,
      actorRole: context.membership.role,
      actorUserId,
      entityId: task.id,
      entityType: "task",
      metadata: {
        assignedToUserId,
        changedFields,
        linkedEntityId: linkedEntity.entityId,
        linkedEntityType: linkedEntity.entityType,
      },
      source: "api",
      workspaceId,
    });

    return this.buildMutationResponse(context, task.id, "Task updated");
  }

  async updateTaskStatus(
    context: ApiWorkspaceContext,
    taskId: string,
    input: TaskStatusActionRequest,
  ): Promise<TaskMutationResponse> {
    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;
    const existingTask = await this.selectTaskRecord(context, taskId);
    await this.assertCanUpdateTaskStatus(context, existingTask, input.action);

    const now = new Date();
    let auditAction: AuditAction;
    let message: string;
    let nextCompletedAt: Date | null = null;
    let nextSnoozedUntil: Date | null = null;
    let nextStatus: ApiTaskStatus;

    switch (input.action) {
      case "complete":
        if (existingTask.status === "done") {
          throw new BadRequestException("Task is already complete");
        }

        auditAction = AuditAction.TASK_COMPLETED;
        message = "Task completed";
        nextCompletedAt = now;
        nextStatus = "done";
        break;
      case "snooze":
        if (existingTask.status === "done") {
          throw new BadRequestException(
            "Completed tasks must be reopened before snoozing",
          );
        }

        auditAction = AuditAction.TASK_SNOOZED;
        message = "Task snoozed";
        nextSnoozedUntil = toTaskReminderAt(input.snoozedUntil);
        nextStatus = "snoozed";
        break;
      case "reopen":
        if (existingTask.status === "open") {
          throw new BadRequestException("Task is already open");
        }

        auditAction = AuditAction.TASK_REOPENED;
        message = "Task reopened";
        nextStatus = "open";
        break;
    }

    const [task] = await db
      .update(tasks)
      .set({
        completedAt: nextCompletedAt,
        snoozedUntil: nextSnoozedUntil,
        status: nextStatus,
        updatedAt: now,
      })
      .where(and(eq(tasks.workspaceId, workspaceId), eq(tasks.id, taskId)))
      .returning({ id: tasks.id });

    if (!task) {
      throw new NotFoundException("Task not found");
    }

    await writeAuditLog({
      action: auditAction,
      actorRole: context.membership.role,
      actorUserId,
      entityId: task.id,
      entityType: "task",
      metadata: {
        action: input.action,
        assignedToUserId: existingTask.assignedToUserId,
        nextStatus,
        previousCompletedAt: existingTask.completedAt,
        previousSnoozedUntil: existingTask.snoozedUntil,
        previousStatus: existingTask.status,
        snoozedUntil: nextSnoozedUntil?.toISOString() ?? null,
      },
      source: "api",
      workspaceId,
    });

    return this.buildMutationResponse(context, task.id, message);
  }
}
