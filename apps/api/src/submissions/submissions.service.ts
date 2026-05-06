import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ApiJobStatus,
  ApiRiskFlag,
  ApiSubmissionStage,
  ApiUserReference,
  PipelineExportQuery,
  SubmissionFollowUpUpdateRequest,
  SubmissionMutationRequest,
  SubmissionMutationResponse,
  SubmissionRecord,
  SubmissionStageTransitionRequest,
  SubmissionsListQuery,
  SubmissionsListResponse,
} from "@recruitflow/contracts";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  isNull,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import {
  AuditAction,
  auditLogs,
  candidates,
  clients,
  jobs,
  submissions,
  users,
} from "@/lib/db/schema";
import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";

const countValue = sql<number>`cast(count(${submissions.id}) as int)`;

const restrictedSubmissionMutationMessage =
  "Only owners and recruiters can create submissions";
const restrictedSubmissionStageTransitionMessage =
  "Only owners and recruiters can change submission stages";
const restrictedSubmissionFollowUpUpdateMessage =
  "Only owners and recruiters can update submission follow-up fields";
const submissionsExportRestrictedMessage =
  "Pipeline export is limited to workspace members with coordinator access or higher";
const emptySubmissionsExportMessage =
  "No pipeline submissions match the current filters.";
const csvFormulaRiskPattern = /^[=+\-@]|\t|\r|^[ ]+[=+\-@]/;

type SubmissionFilterQuery = Pick<
  SubmissionsListQuery,
  | "candidateId"
  | "clientId"
  | "includeArchived"
  | "jobId"
  | "owner"
  | "ownerUserId"
  | "q"
  | "riskFlag"
  | "search"
  | "stage"
> & {
  risk?: ApiRiskFlag;
};

type NormalizedSubmissionFilters = {
  candidateId: string | null;
  clientId: string | null;
  includeArchived: boolean;
  jobId: string | null;
  owner: string | null;
  q: string | null;
  riskFlag: ApiRiskFlag | null;
  stage: ApiSubmissionStage | null;
};

type SubmissionRecordRow = {
  candidateCurrentCompany: string | null;
  candidateCurrentTitle: string | null;
  candidateFullName: string;
  candidateHeadline: string | null;
  candidateId: string;
  candidateSource: string | null;
  clientId: string | null;
  clientName: string | null;
  createdAt: Date;
  currency: string | null;
  id: string;
  jobClientId: string;
  jobId: string;
  jobStatus: ApiJobStatus;
  jobTitle: string;
  lastTouchAt: Date | null;
  latestFeedbackAt: Date | null;
  lostReason: string | null;
  nextStep: string | null;
  offerAmount: number | null;
  ownerEmail: string | null;
  ownerName: string | null;
  ownerUserId: string | null;
  riskFlag: ApiRiskFlag;
  stage: ApiSubmissionStage;
  submittedAt: Date | null;
  updatedAt: Date;
};

type SubmissionExportResponse = {
  body: Buffer;
  cacheControl: string;
  contentDisposition: string;
  contentType: string;
};

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const normalizeTextFilter = (value: string | undefined) => {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
};

const normalizeSubmissionFilters = (
  query: SubmissionFilterQuery,
): NormalizedSubmissionFilters => ({
  candidateId: query.candidateId ?? null,
  clientId: query.clientId ?? null,
  includeArchived: query.includeArchived,
  jobId: query.jobId ?? null,
  owner: query.owner ?? query.ownerUserId ?? null,
  q: normalizeTextFilter(query.q ?? query.search),
  riskFlag: query.riskFlag ?? query.risk ?? null,
  stage: query.stage ?? null,
});

const getOwnerReference = (
  row: SubmissionRecordRow,
): ApiUserReference | null => {
  if (!row.ownerUserId || !row.ownerEmail) {
    return null;
  }

  return {
    email: row.ownerEmail,
    id: row.ownerUserId,
    name: row.ownerName,
  };
};

const serializeSubmissionRecord = (
  row: SubmissionRecordRow,
): SubmissionRecord => ({
  candidate: {
    currentCompany: row.candidateCurrentCompany,
    currentTitle: row.candidateCurrentTitle,
    fullName: row.candidateFullName,
    headline: row.candidateHeadline,
    id: row.candidateId,
    source: row.candidateSource,
  },
  candidateId: row.candidateId,
  createdAt: row.createdAt.toISOString(),
  currency: row.currency,
  id: row.id,
  job: {
    client: row.clientId
      ? {
          id: row.clientId,
          name: row.clientName ?? "Unknown client",
        }
      : null,
    clientId: row.jobClientId,
    id: row.jobId,
    status: row.jobStatus,
    title: row.jobTitle,
  },
  jobId: row.jobId,
  lastTouchAt: toIsoString(row.lastTouchAt),
  latestFeedbackAt: toIsoString(row.latestFeedbackAt),
  lostReason: row.lostReason,
  nextStep: row.nextStep,
  offerAmount: row.offerAmount,
  owner: getOwnerReference(row),
  ownerUserId: row.ownerUserId,
  riskFlag: row.riskFlag,
  stage: row.stage,
  submittedAt: toIsoString(row.submittedAt),
  updatedAt: row.updatedAt.toISOString(),
});

const isSubmittedStage = (stage: ApiSubmissionStage) =>
  !["sourced", "screening"].includes(stage);

const buildAttachmentDisposition = (fileName: string) => {
  const sanitizedFallback = fileName
    .replace(/[^\x20-\x7e]+/g, "_")
    .replace(/["\\]/g, "_");
  const encodedFileName = encodeURIComponent(fileName);

  return `attachment; filename="${sanitizedFallback}"; filename*=UTF-8''${encodedFileName}`;
};

const buildPipelineExportFileName = () =>
  `pipeline-export-${new Date().toISOString().slice(0, 10)}.csv`;

const escapeCsvCell = (value: string | number | null) => {
  const rawValue = value == null ? "" : String(value);
  const safeValue = csvFormulaRiskPattern.test(rawValue)
    ? `'${rawValue}`
    : rawValue;

  return `"${safeValue.replace(/"/g, '""')}"`;
};

const buildPipelineCsv = (rows: SubmissionRecordRow[]) => {
  const header = [
    "candidate",
    "job",
    "client",
    "stage",
    "ownerName",
    "ownerEmail",
    "risk",
    "nextStep",
    "lastTouchAt",
    "submittedAt",
    "latestFeedbackAt",
    "createdAt",
    "updatedAt",
    "lostReason",
    "offerAmount",
    "currency",
  ];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.candidateFullName,
        row.jobTitle,
        row.clientName,
        row.stage,
        row.ownerName,
        row.ownerEmail,
        row.riskFlag,
        row.nextStep,
        toIsoString(row.lastTouchAt),
        toIsoString(row.submittedAt),
        toIsoString(row.latestFeedbackAt),
        row.createdAt.toISOString(),
        row.updatedAt.toISOString(),
        row.lostReason,
        row.offerAmount,
        row.currency,
      ]
        .map((value) =>
          escapeCsvCell(
            typeof value === "number" || typeof value === "string"
              ? value
              : null,
          ),
        )
        .join(","),
    ),
  ];

  return Buffer.from(`\uFEFF${lines.join("\r\n")}\r\n`, "utf8");
};

@Injectable()
export class SubmissionsService {
  private assertCanCreateSubmission(context: ApiWorkspaceContext) {
    if (context.membership.role === "owner") {
      return;
    }

    if (context.membership.role === "recruiter") {
      return;
    }

    throw new ForbiddenException(restrictedSubmissionMutationMessage);
  }

  private assertCanChangeSubmissionStage(context: ApiWorkspaceContext) {
    if (context.membership.role === "owner") {
      return;
    }

    if (context.membership.role === "recruiter") {
      return;
    }

    throw new ForbiddenException(restrictedSubmissionStageTransitionMessage);
  }

  private assertCanUpdateSubmissionFollowUp(context: ApiWorkspaceContext) {
    if (context.membership.role === "owner") {
      return;
    }

    if (context.membership.role === "recruiter") {
      return;
    }

    throw new ForbiddenException(restrictedSubmissionFollowUpUpdateMessage);
  }

  private assertCanExportSubmissions(context: ApiWorkspaceContext) {
    if (
      !["owner", "recruiter", "coordinator"].includes(context.membership.role)
    ) {
      throw new ForbiddenException(submissionsExportRestrictedMessage);
    }
  }

  private getOwnerOptions(context: ApiWorkspaceContext): ApiUserReference[] {
    return context.workspace.memberships.map((membership) => ({
      email: membership.user.email,
      id: membership.user.id,
      name: membership.user.name,
    }));
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
        "Submission owner must be a member of the current workspace",
      );
    }

    return ownerUserId;
  }

  private async assertJobInWorkspace(
    context: ApiWorkspaceContext,
    jobId: string,
  ) {
    const [job] = await db
      .select({
        clientId: jobs.clientId,
        currency: jobs.currency,
        id: jobs.id,
        status: jobs.status,
        title: jobs.title,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.id, jobId),
          eq(jobs.workspaceId, context.workspace.id),
          isNull(jobs.archivedAt),
        ),
      )
      .limit(1);

    if (!job) {
      throw new BadRequestException(
        "Submission job must belong to the current workspace",
      );
    }

    if (["closed", "filled"].includes(job.status)) {
      throw new BadRequestException(
        "Submissions can only be created for active job intake records",
      );
    }

    return job;
  }

  private async assertCandidateInWorkspace(
    context: ApiWorkspaceContext,
    candidateId: string,
  ) {
    const [candidate] = await db
      .select({
        fullName: candidates.fullName,
        id: candidates.id,
      })
      .from(candidates)
      .where(
        and(
          eq(candidates.id, candidateId),
          eq(candidates.workspaceId, context.workspace.id),
          isNull(candidates.archivedAt),
        ),
      )
      .limit(1);

    if (!candidate) {
      throw new BadRequestException(
        "Submission candidate must belong to the current workspace",
      );
    }

    return candidate;
  }

  private async selectSubmissionRecord(
    context: ApiWorkspaceContext,
    submissionId: string,
  ) {
    const [row] = await db
      .select({
        candidateCurrentCompany: candidates.currentCompany,
        candidateCurrentTitle: candidates.currentTitle,
        candidateFullName: candidates.fullName,
        candidateHeadline: candidates.headline,
        candidateId: submissions.candidateId,
        candidateSource: candidates.source,
        clientId: clients.id,
        clientName: clients.name,
        createdAt: submissions.createdAt,
        currency: submissions.currency,
        id: submissions.id,
        jobClientId: jobs.clientId,
        jobId: submissions.jobId,
        jobStatus: jobs.status,
        jobTitle: jobs.title,
        lastTouchAt: submissions.lastTouchAt,
        latestFeedbackAt: submissions.latestFeedbackAt,
        lostReason: submissions.lostReason,
        nextStep: submissions.nextStep,
        offerAmount: submissions.offerAmount,
        ownerEmail: users.email,
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
          eq(submissions.id, submissionId),
          eq(submissions.workspaceId, context.workspace.id),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException("Submission not found");
    }

    return serializeSubmissionRecord(row);
  }

  private buildSubmissionWhereClause(
    workspaceId: string,
    query: SubmissionFilterQuery,
  ) {
    const filters = normalizeSubmissionFilters(query);
    const whereClauses: SQL[] = [eq(submissions.workspaceId, workspaceId)];

    if (!filters.includeArchived) {
      whereClauses.push(isNull(jobs.archivedAt));
      whereClauses.push(isNull(candidates.archivedAt));
    }

    if (filters.q) {
      const searchPattern = `%${filters.q}%`;
      const searchCondition = or(
        ilike(candidates.fullName, searchPattern),
        ilike(jobs.title, searchPattern),
        ilike(clients.name, searchPattern),
        ilike(submissions.nextStep, searchPattern),
      );

      if (searchCondition) {
        whereClauses.push(searchCondition);
      }
    }

    if (filters.candidateId) {
      whereClauses.push(eq(submissions.candidateId, filters.candidateId));
    }

    if (filters.clientId) {
      whereClauses.push(eq(jobs.clientId, filters.clientId));
    }

    if (filters.jobId) {
      whereClauses.push(eq(submissions.jobId, filters.jobId));
    }

    if (filters.owner) {
      whereClauses.push(eq(submissions.ownerUserId, filters.owner));
    }

    if (filters.riskFlag) {
      whereClauses.push(eq(submissions.riskFlag, filters.riskFlag));
    }

    if (filters.stage) {
      whereClauses.push(eq(submissions.stage, filters.stage));
    }

    return {
      filters,
      whereClause: and(...whereClauses),
    };
  }

  private getFilteredSubmissionRows(whereClause: SQL | undefined) {
    return db
      .select({
        candidateCurrentCompany: candidates.currentCompany,
        candidateCurrentTitle: candidates.currentTitle,
        candidateFullName: candidates.fullName,
        candidateHeadline: candidates.headline,
        candidateId: submissions.candidateId,
        candidateSource: candidates.source,
        clientId: clients.id,
        clientName: clients.name,
        createdAt: submissions.createdAt,
        currency: submissions.currency,
        id: submissions.id,
        jobClientId: jobs.clientId,
        jobId: submissions.jobId,
        jobStatus: jobs.status,
        jobTitle: jobs.title,
        lastTouchAt: submissions.lastTouchAt,
        latestFeedbackAt: submissions.latestFeedbackAt,
        lostReason: submissions.lostReason,
        nextStep: submissions.nextStep,
        offerAmount: submissions.offerAmount,
        ownerEmail: users.email,
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
      .where(whereClause)
      .orderBy(
        sql`${submissions.lastTouchAt} desc nulls last`,
        desc(submissions.updatedAt),
        asc(submissions.id),
      );
  }

  async listSubmissions(
    context: ApiWorkspaceContext,
    query: SubmissionsListQuery,
  ): Promise<SubmissionsListResponse> {
    const workspaceId = context.workspace.id;
    const page = query.page;
    const pageSize = query.pageSize;
    const offset = (page - 1) * pageSize;
    const { filters, whereClause } = this.buildSubmissionWhereClause(
      workspaceId,
      query,
    );
    const [totalRow] = await db
      .select({ count: countValue })
      .from(submissions)
      .innerJoin(jobs, eq(submissions.jobId, jobs.id))
      .innerJoin(candidates, eq(submissions.candidateId, candidates.id))
      .leftJoin(clients, eq(jobs.clientId, clients.id))
      .where(whereClause);
    const rows = await db
      .select({
        candidateCurrentCompany: candidates.currentCompany,
        candidateCurrentTitle: candidates.currentTitle,
        candidateFullName: candidates.fullName,
        candidateHeadline: candidates.headline,
        candidateId: submissions.candidateId,
        candidateSource: candidates.source,
        clientId: clients.id,
        clientName: clients.name,
        createdAt: submissions.createdAt,
        currency: submissions.currency,
        id: submissions.id,
        jobClientId: jobs.clientId,
        jobId: submissions.jobId,
        jobStatus: jobs.status,
        jobTitle: jobs.title,
        lastTouchAt: submissions.lastTouchAt,
        latestFeedbackAt: submissions.latestFeedbackAt,
        lostReason: submissions.lostReason,
        nextStep: submissions.nextStep,
        offerAmount: submissions.offerAmount,
        ownerEmail: users.email,
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
      .where(whereClause)
      .orderBy(
        sql`${submissions.lastTouchAt} desc nulls last`,
        desc(submissions.updatedAt),
        asc(submissions.id),
      )
      .limit(pageSize)
      .offset(offset);
    const totalItems = totalRow?.count ?? 0;

    return {
      context: {
        role: context.membership.role,
        workspaceId,
      },
      contractVersion: "phase-1",
      filters,
      items: rows.map(serializeSubmissionRecord),
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

  async exportPipeline(
    context: ApiWorkspaceContext,
    query: PipelineExportQuery,
  ): Promise<SubmissionExportResponse> {
    this.assertCanExportSubmissions(context);

    const workspaceId = context.workspace.id;
    const { filters, whereClause } = this.buildSubmissionWhereClause(
      workspaceId,
      query,
    );
    const rows = await this.getFilteredSubmissionRows(whereClause);

    if (rows.length === 0) {
      throw new HttpException(
        {
          code: "RESULT_SET_EMPTY",
          error: emptySubmissionsExportMessage,
        },
        409,
      );
    }

    await db.insert(auditLogs).values({
      action: AuditAction.RESULT_SET_EXPORTED,
      actorUserId: context.membership.userId,
      entityType: "submission",
      metadataJson: {
        actorRole: context.membership.role,
        filters,
        module: "pipeline",
        rowCount: rows.length,
        source: "api",
        sourceSurface: query.sourceSurface,
        view: query.view,
      },
      workspaceId,
    });

    return {
      body: buildPipelineCsv(rows),
      cacheControl: "private, no-store",
      contentDisposition: buildAttachmentDisposition(
        buildPipelineExportFileName(),
      ),
      contentType: "text/csv; charset=utf-8",
    };
  }

  async createSubmission(
    context: ApiWorkspaceContext,
    input: SubmissionMutationRequest,
  ): Promise<SubmissionMutationResponse> {
    this.assertCanCreateSubmission(context);

    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;
    const ownerUserId = this.resolveOwnerUserId(context, input.ownerUserId);
    const [job, candidate] = await Promise.all([
      this.assertJobInWorkspace(context, input.jobId),
      this.assertCandidateInWorkspace(context, input.candidateId),
    ]);
    const [existingSubmission] = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(
        and(
          eq(submissions.workspaceId, workspaceId),
          eq(submissions.jobId, input.jobId),
          eq(submissions.candidateId, input.candidateId),
        ),
      )
      .limit(1);

    if (existingSubmission) {
      throw new ConflictException(
        "This candidate has already been submitted to this job",
      );
    }

    const now = new Date();
    const createdSubmission = await db.transaction(async (tx) => {
      const [submission] = await tx
        .insert(submissions)
        .values({
          candidateId: input.candidateId,
          createdByUserId: actorUserId,
          currency: job.currency ?? "USD",
          jobId: input.jobId,
          lastTouchAt: now,
          nextStep: input.nextStep,
          ownerUserId,
          riskFlag: input.riskFlag,
          stage: input.stage,
          submittedAt: isSubmittedStage(input.stage) ? now : null,
          workspaceId,
        })
        .returning({ id: submissions.id });

      if (!submission) {
        throw new NotFoundException("Failed to create submission");
      }

      await tx.insert(auditLogs).values({
        action: AuditAction.SUBMISSION_CREATED,
        actorUserId,
        entityId: submission.id,
        entityType: "submission",
        metadataJson: {
          actorRole: context.membership.role,
          candidateId: input.candidateId,
          candidateName: candidate.fullName,
          jobId: input.jobId,
          jobTitle: job.title,
          ownerUserId,
          riskFlag: input.riskFlag,
          source: "api",
          stage: input.stage,
        },
        workspaceId,
      });

      return submission;
    });

    return {
      context: {
        role: context.membership.role,
        workspaceId,
      },
      contractVersion: "phase-1",
      message: "Submission created successfully",
      submission: await this.selectSubmissionRecord(
        context,
        createdSubmission.id,
      ),
      workspaceScoped: true,
    };
  }

  async updateSubmissionStage(
    context: ApiWorkspaceContext,
    submissionId: string,
    input: SubmissionStageTransitionRequest,
  ): Promise<SubmissionMutationResponse> {
    this.assertCanChangeSubmissionStage(context);

    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;
    const existingSubmission = await this.selectSubmissionRecord(
      context,
      submissionId,
    );

    if (existingSubmission.stage === input.stage) {
      return {
        context: {
          role: context.membership.role,
          workspaceId,
        },
        contractVersion: "phase-1",
        message: "Submission stage unchanged",
        submission: existingSubmission,
        workspaceScoped: true,
      };
    }

    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(submissions)
        .set({
          lastTouchAt: now,
          stage: input.stage,
          submittedAt:
            isSubmittedStage(input.stage) && !existingSubmission.submittedAt
              ? now
              : undefined,
          updatedAt: now,
        })
        .where(
          and(
            eq(submissions.id, submissionId),
            eq(submissions.workspaceId, workspaceId),
          ),
        );

      await tx.insert(auditLogs).values({
        action: AuditAction.SUBMISSION_STAGE_CHANGED,
        actorUserId,
        entityId: submissionId,
        entityType: "submission",
        metadataJson: {
          actorRole: context.membership.role,
          candidateId: existingSubmission.candidateId,
          fromStage: existingSubmission.stage,
          jobId: existingSubmission.jobId,
          source: "api",
          toStage: input.stage,
        },
        workspaceId,
      });
    });

    return {
      context: {
        role: context.membership.role,
        workspaceId,
      },
      contractVersion: "phase-1",
      message: "Submission stage updated successfully",
      submission: await this.selectSubmissionRecord(context, submissionId),
      workspaceScoped: true,
    };
  }

  async updateSubmissionFollowUp(
    context: ApiWorkspaceContext,
    submissionId: string,
    input: SubmissionFollowUpUpdateRequest,
  ): Promise<SubmissionMutationResponse> {
    this.assertCanUpdateSubmissionFollowUp(context);

    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;
    const existingSubmission = await this.selectSubmissionRecord(
      context,
      submissionId,
    );
    const riskChanged =
      input.riskFlag !== undefined &&
      input.riskFlag !== existingSubmission.riskFlag;
    const nextStepChanged =
      input.nextStep !== undefined &&
      input.nextStep !== existingSubmission.nextStep;

    if (!riskChanged && !nextStepChanged) {
      return {
        context: {
          role: context.membership.role,
          workspaceId,
        },
        contractVersion: "phase-1",
        message: "Submission follow-up unchanged",
        submission: existingSubmission,
        workspaceScoped: true,
      };
    }

    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(submissions)
        .set({
          lastTouchAt: now,
          nextStep: nextStepChanged ? input.nextStep : undefined,
          riskFlag: riskChanged ? input.riskFlag : undefined,
          updatedAt: now,
        })
        .where(
          and(
            eq(submissions.id, submissionId),
            eq(submissions.workspaceId, workspaceId),
          ),
        );

      if (riskChanged) {
        await tx.insert(auditLogs).values({
          action: AuditAction.SUBMISSION_RISK_UPDATED,
          actorUserId,
          entityId: submissionId,
          entityType: "submission",
          metadataJson: {
            actorRole: context.membership.role,
            candidateId: existingSubmission.candidateId,
            fromRiskFlag: existingSubmission.riskFlag,
            jobId: existingSubmission.jobId,
            source: "api",
            toRiskFlag: input.riskFlag,
          },
          workspaceId,
        });
      }

      if (nextStepChanged) {
        await tx.insert(auditLogs).values({
          action: AuditAction.SUBMISSION_NEXT_STEP_UPDATED,
          actorUserId,
          entityId: submissionId,
          entityType: "submission",
          metadataJson: {
            actorRole: context.membership.role,
            candidateId: existingSubmission.candidateId,
            fromNextStep: existingSubmission.nextStep,
            jobId: existingSubmission.jobId,
            source: "api",
            toNextStep: input.nextStep,
          },
          workspaceId,
        });
      }
    });

    return {
      context: {
        role: context.membership.role,
        workspaceId,
      },
      contractVersion: "phase-1",
      message: "Submission follow-up updated successfully",
      submission: await this.selectSubmissionRecord(context, submissionId),
      workspaceScoped: true,
    };
  }
}
