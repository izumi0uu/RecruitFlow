import {
  BadRequestException,
  ConflictException,
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
  type ApiJobStatus,
  type ApiRiskFlag,
  type ApiSubmissionStage,
  type ApiUserReference,
  type SubmissionMutationRequest,
  type SubmissionMutationResponse,
  type SubmissionRecord,
  type SubmissionsListQuery,
  type SubmissionsListResponse,
} from "@recruitflow/contracts";

import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";

import {
  AuditAction,
  auditLogs,
  candidates,
  clients,
  jobs,
  submissions,
  users,
} from "@/lib/db/schema";

const countValue = sql<number>`cast(count(${submissions.id}) as int)`;

const restrictedSubmissionMutationMessage =
  "Only owners and recruiters can create submissions";

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

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const normalizeTextFilter = (value: string | undefined) => {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
};

const getOwnerReference = (row: SubmissionRecordRow): ApiUserReference | null => {
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

  async listSubmissions(
    context: ApiWorkspaceContext,
    query: SubmissionsListQuery,
  ): Promise<SubmissionsListResponse> {
    const workspaceId = context.workspace.id;
    const q = normalizeTextFilter(query.q ?? query.search);
    const owner = query.owner ?? query.ownerUserId ?? null;
    const page = query.page;
    const pageSize = query.pageSize;
    const offset = (page - 1) * pageSize;
    const whereClauses: SQL[] = [
      eq(submissions.workspaceId, workspaceId),
    ];

    if (!query.includeArchived) {
      whereClauses.push(isNull(jobs.archivedAt));
      whereClauses.push(isNull(candidates.archivedAt));
    }

    if (q) {
      const searchPattern = `%${q}%`;

      whereClauses.push(
        or(
          ilike(candidates.fullName, searchPattern),
          ilike(jobs.title, searchPattern),
          ilike(clients.name, searchPattern),
          ilike(submissions.nextStep, searchPattern),
        )!,
      );
    }

    if (query.candidateId) {
      whereClauses.push(eq(submissions.candidateId, query.candidateId));
    }

    if (query.clientId) {
      whereClauses.push(eq(jobs.clientId, query.clientId));
    }

    if (query.jobId) {
      whereClauses.push(eq(submissions.jobId, query.jobId));
    }

    if (owner) {
      whereClauses.push(eq(submissions.ownerUserId, owner));
    }

    if (query.riskFlag) {
      whereClauses.push(eq(submissions.riskFlag, query.riskFlag));
    }

    if (query.stage) {
      whereClauses.push(eq(submissions.stage, query.stage));
    }

    const whereClause = and(...whereClauses);
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
      filters: {
        candidateId: query.candidateId ?? null,
        clientId: query.clientId ?? null,
        includeArchived: query.includeArchived,
        jobId: query.jobId ?? null,
        owner,
        q,
        riskFlag: query.riskFlag ?? null,
        stage: query.stage ?? null,
      },
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
}
