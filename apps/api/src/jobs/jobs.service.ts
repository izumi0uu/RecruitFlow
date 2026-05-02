import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import {
  apiDefaultJobStageTemplate,
  type ApiSubmissionStage,
  type JobRecord,
  type JobDetailResponse,
  type JobMutationRequest,
  type JobMutationResponse,
  type JobStageRecord,
  type JobStageRepairResponse,
  type JobStageTemplateSummary,
  type JobsListClientOption,
  type JobsListOwnerOption,
  type JobsListQuery,
  type JobsListResponse,
} from "@recruitflow/contracts";

import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";

import { writeAuditLog } from "@/lib/db/audit";
import {
  AuditAction,
  clients,
  jobs,
  jobStages,
  users,
} from "@/lib/db/schema";

const countValue = sql<number>`cast(count(${jobs.id}) as int)`;
const priorityRankValue = sql<number>`case ${jobs.priority}
  when 'urgent' then 4
  when 'high' then 3
  when 'medium' then 2
  else 1
end`;

type JobRecordRow = {
  archivedAt: Date | null;
  client: JobsListClientOption | null;
  clientId: string;
  createdAt: Date;
  currency: string | null;
  department: string | null;
  description: string | null;
  employmentType: string | null;
  headcount: number | null;
  id: string;
  intakeSummary: string | null;
  location: string | null;
  openedAt: Date | null;
  owner: JobsListOwnerOption | null;
  ownerUserId: string | null;
  placementFeePercent: number | null;
  priority: JobRecord["priority"];
  salaryMax: number | null;
  salaryMin: number | null;
  status: JobRecord["status"];
  targetFillDate: Date | null;
  title: string;
  updatedAt: Date;
};

type JobStageRow = {
  createdAt: Date;
  id: string;
  isClosedStage: boolean;
  key: string;
  label: string;
  sortOrder: number;
  updatedAt: Date;
};

const restrictedStageTemplateMessage =
  "Coordinators can read job stage templates but cannot repair or initialize them";
const restrictedJobMutationMessage =
  "Only owners and recruiters can create, update, or repair jobs";

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const toOptionalDate = (value: string | null | undefined) =>
  value ? new Date(`${value}T00:00:00.000Z`) : null;

const normalizeTextFilter = (value: string | undefined) => {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
};

const normalizeCurrency = (value: string | null | undefined) => {
  const normalizedValue = value?.trim().toUpperCase();

  return normalizedValue ? normalizedValue : "USD";
};

const serializeJobRecord = (row: JobRecordRow): JobRecord => ({
  ...row,
  archivedAt: toIsoString(row.archivedAt),
  client: row.client?.id ? row.client : null,
  createdAt: row.createdAt.toISOString(),
  openedAt: toIsoString(row.openedAt),
  owner: row.owner?.id ? row.owner : null,
  targetFillDate: toIsoString(row.targetFillDate),
  updatedAt: row.updatedAt.toISOString(),
});

const serializeJobStageRecord = (row: JobStageRow): JobStageRecord => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const getMissingStageKeys = (stages: Pick<JobStageRecord, "key">[]) => {
  const existingKeys = new Set(stages.map((stage) => stage.key));

  return apiDefaultJobStageTemplate
    .filter((stage) => !existingKeys.has(stage.key))
    .map((stage) => stage.key);
};

const buildStageTemplateSummary = (
  stages: JobStageRecord[],
): JobStageTemplateSummary => {
  const missingStageKeys = getMissingStageKeys(stages);

  return {
    expectedStages: apiDefaultJobStageTemplate.map((stage) => ({ ...stage })),
    missingStageKeys,
    repairable: missingStageKeys.length > 0,
    stages,
    status: missingStageKeys.length === 0 ? "complete" : "missing",
  };
};

const getDefaultStageRows = (input: {
  jobId: string;
  keys?: ApiSubmissionStage[];
  workspaceId: string;
}) => {
  const allowedKeys = input.keys ? new Set(input.keys) : null;

  return apiDefaultJobStageTemplate
    .filter((stage) => allowedKeys == null || allowedKeys.has(stage.key))
    .map((stage) => ({
      isClosedStage: stage.isClosedStage,
      jobId: input.jobId,
      key: stage.key,
      label: stage.label,
      sortOrder: stage.sortOrder,
      workspaceId: input.workspaceId,
    }));
};

const getJobChangedFields = (
  existingJob: JobRecord,
  nextValues: {
    clientId: string;
    currency: string | null;
    department: string | null;
    description: string | null;
    employmentType: string | null;
    headcount: number | null;
    intakeSummary: string | null;
    location: string | null;
    ownerUserId: string;
    placementFeePercent: number | null;
    priority: JobRecord["priority"];
    salaryMax: number | null;
    salaryMin: number | null;
    status: JobRecord["status"];
    targetFillDate: Date | null;
    title: string;
  },
) =>
  Object.entries(nextValues)
    .filter(([field, value]) => {
      const existingValue = existingJob[field as keyof JobRecord];

      if (value instanceof Date) {
        return existingValue !== value.toISOString();
      }

      return existingValue !== value;
    })
    .map(([field]) => field);

const getJobsOrderBy = (sort: JobsListQuery["sort"]) => {
  switch (sort) {
    case "priority_desc":
      return [desc(priorityRankValue), asc(jobs.title), asc(jobs.id)];
    case "target_fill_asc":
      return [
        sql`${jobs.targetFillDate} asc nulls last`,
        asc(jobs.title),
        asc(jobs.id),
      ];
    case "title_asc":
      return [asc(jobs.title), asc(jobs.id)];
    case "updated_desc":
      return [desc(jobs.updatedAt), asc(jobs.title), asc(jobs.id)];
    case "opened_desc":
    default:
      return [
        sql`${jobs.openedAt} desc nulls last`,
        desc(jobs.createdAt),
        asc(jobs.id),
      ];
  }
};

@Injectable()
export class JobsService {
  private getOwnerOptions(context: ApiWorkspaceContext) {
    return context.workspace.memberships.map((membership) => ({
      email: membership.user.email,
      id: membership.user.id,
      name: membership.user.name,
    }));
  }

  private async getClientOptions(
    context: ApiWorkspaceContext,
  ): Promise<JobsListClientOption[]> {
    return db
      .select({
        id: clients.id,
        name: clients.name,
      })
      .from(clients)
      .where(
        and(
          eq(clients.workspaceId, context.workspace.id),
          isNull(clients.archivedAt),
        ),
      )
      .orderBy(asc(clients.name), asc(clients.id));
  }

  private resolveOwnerUserId(
    context: ApiWorkspaceContext,
    ownerUserId: string,
  ) {
    const ownerBelongsToWorkspace = context.workspace.memberships.some(
      (membership) => membership.userId === ownerUserId,
    );

    if (!ownerBelongsToWorkspace) {
      throw new BadRequestException(
        "Job owner must be a member of the current workspace",
      );
    }

    return ownerUserId;
  }

  private async assertClientInWorkspace(
    context: ApiWorkspaceContext,
    clientId: string,
  ) {
    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(
        and(
          eq(clients.id, clientId),
          eq(clients.workspaceId, context.workspace.id),
          isNull(clients.archivedAt),
        ),
      )
      .limit(1);

    if (!client) {
      throw new BadRequestException(
        "Job client must belong to the current workspace",
      );
    }
  }

  private assertCanRepairStageTemplate(context: ApiWorkspaceContext) {
    this.assertCanMutateJobs(context, restrictedStageTemplateMessage);
  }

  private assertCanMutateJobs(
    context: ApiWorkspaceContext,
    message = restrictedJobMutationMessage,
  ) {
    if (context.membership.role === "owner") {
      return;
    }

    if (context.membership.role === "recruiter") {
      return;
    }

    throw new ForbiddenException(message);
  }

  private async selectJobRecord(
    context: ApiWorkspaceContext,
    jobId: string,
  ) {
    const [row] = await db
      .select({
        archivedAt: jobs.archivedAt,
        client: {
          id: clients.id,
          name: clients.name,
        },
        clientId: jobs.clientId,
        createdAt: jobs.createdAt,
        currency: jobs.currency,
        department: jobs.department,
        description: jobs.description,
        employmentType: jobs.employmentType,
        headcount: jobs.headcount,
        id: jobs.id,
        intakeSummary: jobs.intakeSummary,
        location: jobs.location,
        openedAt: jobs.openedAt,
        owner: {
          email: users.email,
          id: users.id,
          name: users.name,
        },
        ownerUserId: jobs.ownerUserId,
        placementFeePercent: jobs.placementFeePercent,
        priority: jobs.priority,
        salaryMax: jobs.salaryMax,
        salaryMin: jobs.salaryMin,
        status: jobs.status,
        targetFillDate: jobs.targetFillDate,
        title: jobs.title,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .leftJoin(clients, eq(jobs.clientId, clients.id))
      .leftJoin(users, eq(jobs.ownerUserId, users.id))
      .where(
        and(
          eq(jobs.id, jobId),
          eq(jobs.workspaceId, context.workspace.id),
          isNull(jobs.archivedAt),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException("Job not found");
    }

    return serializeJobRecord(row);
  }

  private async selectJobStages(
    context: ApiWorkspaceContext,
    jobId: string,
  ): Promise<JobStageRecord[]> {
    const rows = await db
      .select({
        createdAt: jobStages.createdAt,
        id: jobStages.id,
        isClosedStage: jobStages.isClosedStage,
        key: jobStages.key,
        label: jobStages.label,
        sortOrder: jobStages.sortOrder,
        updatedAt: jobStages.updatedAt,
      })
      .from(jobStages)
      .where(
        and(
          eq(jobStages.jobId, jobId),
          eq(jobStages.workspaceId, context.workspace.id),
        ),
      )
      .orderBy(asc(jobStages.sortOrder), asc(jobStages.id));

    return rows.map(serializeJobStageRecord);
  }

  private async buildDetailResponse(
    context: ApiWorkspaceContext,
    job: JobRecord,
  ): Promise<JobDetailResponse> {
    const stageTemplate = buildStageTemplateSummary(
      await this.selectJobStages(context, job.id),
    );

    return {
      clientOptions: await this.getClientOptions(context),
      context: {
        role: context.membership.role,
        workspaceId: context.workspace.id,
      },
      contractVersion: "phase-1",
      job,
      ownerOptions: this.getOwnerOptions(context),
      stageTemplate,
      workspaceScoped: true,
    };
  }

  async listJobs(
    context: ApiWorkspaceContext,
    query: JobsListQuery,
  ): Promise<JobsListResponse> {
    const q = normalizeTextFilter(query.q ?? query.search);
    const owner = query.owner ?? query.ownerUserId ?? null;
    const page = query.page;
    const pageSize = query.pageSize;
    const offset = (page - 1) * pageSize;
    const orderBy = getJobsOrderBy(query.sort);
    const whereClauses: SQL[] = [eq(jobs.workspaceId, context.workspace.id)];

    if (!query.includeArchived) {
      whereClauses.push(isNull(jobs.archivedAt));
    }

    if (q) {
      const searchPattern = `%${q}%`;

      whereClauses.push(
        or(
          ilike(jobs.title, searchPattern),
          ilike(jobs.department, searchPattern),
          ilike(jobs.location, searchPattern),
          ilike(clients.name, searchPattern),
        )!,
      );
    }

    if (query.clientId) {
      whereClauses.push(eq(jobs.clientId, query.clientId));
    }

    if (query.status) {
      whereClauses.push(eq(jobs.status, query.status));
    }

    if (query.priority) {
      whereClauses.push(eq(jobs.priority, query.priority));
    }

    if (owner) {
      whereClauses.push(eq(jobs.ownerUserId, owner));
    }

    const whereClause = and(...whereClauses);
    const [totalRow] = await db
      .select({ count: countValue })
      .from(jobs)
      .leftJoin(clients, eq(jobs.clientId, clients.id))
      .where(whereClause);
    const rows = await db
      .select({
        archivedAt: jobs.archivedAt,
        client: {
          id: clients.id,
          name: clients.name,
        },
        clientId: jobs.clientId,
        createdAt: jobs.createdAt,
        currency: jobs.currency,
        department: jobs.department,
        description: jobs.description,
        employmentType: jobs.employmentType,
        headcount: jobs.headcount,
        id: jobs.id,
        intakeSummary: jobs.intakeSummary,
        location: jobs.location,
        openedAt: jobs.openedAt,
        owner: {
          email: users.email,
          id: users.id,
          name: users.name,
        },
        ownerUserId: jobs.ownerUserId,
        placementFeePercent: jobs.placementFeePercent,
        priority: jobs.priority,
        salaryMax: jobs.salaryMax,
        salaryMin: jobs.salaryMin,
        status: jobs.status,
        targetFillDate: jobs.targetFillDate,
        title: jobs.title,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .leftJoin(clients, eq(jobs.clientId, clients.id))
      .leftJoin(users, eq(jobs.ownerUserId, users.id))
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset(offset);
    const totalItems = totalRow?.count ?? 0;

    return {
      clientOptions: await this.getClientOptions(context),
      context: {
        role: context.membership.role,
        workspaceId: context.workspace.id,
      },
      contractVersion: "phase-1",
      filters: {
        clientId: query.clientId ?? null,
        includeArchived: query.includeArchived,
        owner,
        priority: query.priority ?? null,
        q,
        sort: query.sort,
        status: query.status ?? null,
      },
      items: rows.map(serializeJobRecord),
      ownerOptions: this.getOwnerOptions(context),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
      workspaceScoped: true,
    };
  }

  async getJob(
    context: ApiWorkspaceContext,
    jobId: string,
  ): Promise<JobDetailResponse> {
    const job = await this.selectJobRecord(context, jobId);

    return this.buildDetailResponse(context, job);
  }

  async createJob(
    context: ApiWorkspaceContext,
    input: JobMutationRequest,
  ): Promise<JobMutationResponse> {
    this.assertCanMutateJobs(context);

    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;
    const ownerUserId = this.resolveOwnerUserId(context, input.ownerUserId);
    const openedAt = input.status === "intake" ? null : new Date();

    await this.assertClientInWorkspace(context, input.clientId);

    const createdJob = await db.transaction(async (tx) => {
      const [insertedJob] = await tx
        .insert(jobs)
        .values({
          clientId: input.clientId,
          createdByUserId: actorUserId,
          currency: normalizeCurrency(input.currency),
          department: input.department ?? null,
          description: input.description ?? null,
          employmentType: input.employmentType ?? null,
          headcount: input.headcount ?? null,
          intakeSummary: input.intakeSummary ?? null,
          location: input.location ?? null,
          openedAt,
          ownerUserId,
          placementFeePercent: input.placementFeePercent ?? null,
          priority: input.priority,
          salaryMax: input.salaryMax ?? null,
          salaryMin: input.salaryMin ?? null,
          status: input.status,
          targetFillDate: toOptionalDate(input.targetFillDate),
          title: input.title,
          workspaceId,
        })
        .returning({ id: jobs.id });

      if (!insertedJob) {
        throw new NotFoundException("Failed to create job");
      }

      await tx.insert(jobStages).values(
        getDefaultStageRows({
          jobId: insertedJob.id,
          workspaceId,
        }),
      );

      return insertedJob;
    });

    await writeAuditLog({
      action: AuditAction.JOB_CREATED,
      actorRole: context.membership.role,
      actorUserId,
      entityId: createdJob.id,
      entityType: "job",
      metadata: {
        clientId: input.clientId,
        jobTitle: input.title,
        ownerUserId,
        priority: input.priority,
        status: input.status,
      },
      source: "api",
      workspaceId,
    });

    await writeAuditLog({
      action: AuditAction.JOB_STAGE_TEMPLATE_INITIALIZED,
      actorRole: context.membership.role,
      actorUserId,
      entityId: createdJob.id,
      entityType: "job",
      metadata: {
        mode: "create",
        stageKeys: apiDefaultJobStageTemplate.map((stage) => stage.key),
      },
      source: "api",
      workspaceId,
    });

    const job = await this.selectJobRecord(context, createdJob.id);

    return {
      ...(await this.buildDetailResponse(context, job)),
      message: "Job created successfully",
    };
  }

  async repairJobStageTemplate(
    context: ApiWorkspaceContext,
    jobId: string,
  ): Promise<JobStageRepairResponse> {
    this.assertCanRepairStageTemplate(context);

    const job = await this.selectJobRecord(context, jobId);
    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;
    const existingStages = await this.selectJobStages(context, jobId);
    const missingStageKeys = getMissingStageKeys(existingStages);

    const repairedStageRows =
      missingStageKeys.length > 0
        ? await db
            .insert(jobStages)
            .values(
              getDefaultStageRows({
                jobId,
                keys: missingStageKeys,
                workspaceId,
              }),
            )
            .onConflictDoNothing({
              target: [jobStages.jobId, jobStages.key],
            })
            .returning({ key: jobStages.key })
        : [];
    const repairedStageKeys = repairedStageRows.map(
      (stage) => stage.key as ApiSubmissionStage,
    );

    if (repairedStageKeys.length > 0) {
      await writeAuditLog({
        action: AuditAction.JOB_STAGE_TEMPLATE_INITIALIZED,
        actorRole: context.membership.role,
        actorUserId,
        entityId: jobId,
        entityType: "job",
        metadata: {
          mode: "repair",
          repairedStageKeys,
        },
        source: "api",
        workspaceId,
      });
    }

    return {
      ...(await this.buildDetailResponse(context, job)),
      message:
        repairedStageKeys.length > 0
          ? "Job stage template repaired successfully"
          : "Job stage template is already complete",
      repairedStageKeys,
    };
  }

  async updateJob(
    context: ApiWorkspaceContext,
    jobId: string,
    input: JobMutationRequest,
  ): Promise<JobMutationResponse> {
    this.assertCanMutateJobs(context);

    const existingJob = await this.selectJobRecord(context, jobId);
    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;
    const ownerUserId = this.resolveOwnerUserId(context, input.ownerUserId);
    const openedAt =
      existingJob.openedAt == null && input.status !== "intake"
        ? new Date()
        : existingJob.openedAt
          ? new Date(existingJob.openedAt)
          : null;
    const nextValues = {
      clientId: input.clientId,
      currency: normalizeCurrency(input.currency),
      department: input.department ?? null,
      description: input.description ?? null,
      employmentType: input.employmentType ?? null,
      headcount: input.headcount ?? null,
      intakeSummary: input.intakeSummary ?? null,
      location: input.location ?? null,
      ownerUserId,
      placementFeePercent: input.placementFeePercent ?? null,
      priority: input.priority,
      salaryMax: input.salaryMax ?? null,
      salaryMin: input.salaryMin ?? null,
      status: input.status,
      targetFillDate: toOptionalDate(input.targetFillDate),
      title: input.title,
    };
    const changedFields = getJobChangedFields(existingJob, nextValues);

    await this.assertClientInWorkspace(context, input.clientId);

    await db
      .update(jobs)
      .set({
        ...nextValues,
        openedAt,
        updatedAt: new Date(),
      })
      .where(and(eq(jobs.id, jobId), eq(jobs.workspaceId, workspaceId)));

    await writeAuditLog({
      action: AuditAction.JOB_UPDATED,
      actorRole: context.membership.role,
      actorUserId,
      entityId: jobId,
      entityType: "job",
      metadata: {
        changedFields,
        clientId: input.clientId,
        jobTitle: input.title,
        ownerUserId,
        priority: input.priority,
        status: input.status,
      },
      source: "api",
      workspaceId,
    });

    if (existingJob.status !== input.status) {
      await writeAuditLog({
        action: AuditAction.JOB_STATUS_CHANGED,
        actorRole: context.membership.role,
        actorUserId,
        entityId: jobId,
        entityType: "job",
        metadata: {
          from: existingJob.status,
          jobTitle: input.title,
          to: input.status,
        },
        source: "api",
        workspaceId,
      });
    }

    const job = await this.selectJobRecord(context, jobId);

    return {
      ...(await this.buildDetailResponse(context, job)),
      message: "Job updated successfully",
    };
  }
}
