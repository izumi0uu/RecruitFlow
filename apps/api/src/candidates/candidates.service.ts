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
  type CandidateRecord,
  type CandidateDetailResponse,
  type CandidateMutationRequest,
  type CandidateMutationResponse,
  type CandidatesListOwnerOption,
  type CandidatesListQuery,
  type CandidatesListResponse,
} from "@recruitflow/contracts";

import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";

import { writeAuditLog } from "@/lib/db/audit";
import { AuditAction, candidates, documents, users } from "@/lib/db/schema";

const countValue = sql<number>`cast(count(${candidates.id}) as int)`;

type CandidateRecordRow = {
  archivedAt: Date | null;
  createdAt: Date;
  currentCompany: string | null;
  currentTitle: string | null;
  email: string | null;
  fullName: string;
  hasResume: boolean;
  headline: string | null;
  id: string;
  linkedinUrl: string | null;
  location: string | null;
  noticePeriod: string | null;
  owner: CandidatesListOwnerOption | null;
  ownerUserId: string | null;
  phone: string | null;
  portfolioUrl: string | null;
  salaryExpectation: string | null;
  skillsText: string | null;
  source: string | null;
  summary: string | null;
  updatedAt: Date;
};

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const normalizeTextFilter = (value: string | undefined) => {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
};

const getResumeExistsExpression = (workspaceId: string) => sql<boolean>`exists (
  select 1
  from ${documents}
  where ${documents.workspaceId} = ${workspaceId}
    and ${documents.entityType} = 'candidate'
    and ${documents.entityId} = ${candidates.id}
    and ${documents.type} = 'resume'
)`;

const serializeCandidateRecord = (
  row: CandidateRecordRow,
): CandidateRecord => ({
  ...row,
  archivedAt: toIsoString(row.archivedAt),
  createdAt: row.createdAt.toISOString(),
  owner: row.owner?.id ? row.owner : null,
  updatedAt: row.updatedAt.toISOString(),
});

const getCandidateChangedFields = (
  existingCandidate: CandidateRecord,
  nextValues: {
    currentCompany: string | null;
    currentTitle: string | null;
    email: string | null;
    fullName: string;
    headline: string | null;
    linkedinUrl: string | null;
    location: string | null;
    noticePeriod: string | null;
    ownerUserId: string;
    phone: string | null;
    portfolioUrl: string | null;
    salaryExpectation: string | null;
    skillsText: string | null;
    source: string;
  },
) =>
  Object.entries(nextValues)
    .filter(([field, value]) => {
      const existingValue = existingCandidate[field as keyof CandidateRecord];

      return existingValue !== value;
    })
    .map(([field]) => field);

const candidateMutationRestrictedMessage =
  "Candidate profile mutations are limited to workspace members with coordinator access or higher";

@Injectable()
export class CandidatesService {
  private assertCanMutateCandidates(context: ApiWorkspaceContext) {
    if (
      !["owner", "recruiter", "coordinator"].includes(context.membership.role)
    ) {
      throw new ForbiddenException(candidateMutationRestrictedMessage);
    }
  }

  private getOwnerOptions(context: ApiWorkspaceContext) {
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
        "Candidate owner must be a member of the current workspace",
      );
    }

    return ownerUserId;
  }

  private async selectCandidateRecord(
    context: ApiWorkspaceContext,
    candidateId: string,
  ) {
    const workspaceId = context.workspace.id;
    const resumeExists = getResumeExistsExpression(workspaceId);
    const [row] = await db
      .select({
        archivedAt: candidates.archivedAt,
        createdAt: candidates.createdAt,
        currentCompany: candidates.currentCompany,
        currentTitle: candidates.currentTitle,
        email: candidates.email,
        fullName: candidates.fullName,
        hasResume: resumeExists,
        headline: candidates.headline,
        id: candidates.id,
        linkedinUrl: candidates.linkedinUrl,
        location: candidates.location,
        noticePeriod: candidates.noticePeriod,
        owner: {
          email: users.email,
          id: users.id,
          name: users.name,
        },
        ownerUserId: candidates.ownerUserId,
        phone: candidates.phone,
        portfolioUrl: candidates.portfolioUrl,
        salaryExpectation: candidates.salaryExpectation,
        skillsText: candidates.skillsText,
        source: candidates.source,
        summary: candidates.summary,
        updatedAt: candidates.updatedAt,
      })
      .from(candidates)
      .leftJoin(users, eq(candidates.ownerUserId, users.id))
      .where(
        and(
          eq(candidates.id, candidateId),
          eq(candidates.workspaceId, workspaceId),
          isNull(candidates.archivedAt),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException("Candidate not found");
    }

    return serializeCandidateRecord(row);
  }

  private buildDetailResponse(
    context: ApiWorkspaceContext,
    candidate: CandidateRecord,
  ): CandidateDetailResponse {
    return {
      candidate,
      context: {
        role: context.membership.role,
        workspaceId: context.workspace.id,
      },
      contractVersion: "phase-1",
      ownerOptions: this.getOwnerOptions(context),
      workspaceScoped: true,
    };
  }

  async listCandidates(
    context: ApiWorkspaceContext,
    query: CandidatesListQuery,
  ): Promise<CandidatesListResponse> {
    const workspaceId = context.workspace.id;
    const q = normalizeTextFilter(query.q ?? query.search);
    const owner = query.owner ?? query.ownerUserId ?? null;
    const source = normalizeTextFilter(query.source);
    const location = normalizeTextFilter(query.location);
    const page = query.page;
    const pageSize = query.pageSize;
    const offset = (page - 1) * pageSize;
    const resumeExists = getResumeExistsExpression(workspaceId);
    const whereClauses: SQL[] = [
      eq(candidates.workspaceId, workspaceId),
    ];

    if (!query.includeArchived) {
      whereClauses.push(isNull(candidates.archivedAt));
    }

    if (q) {
      const searchPattern = `%${q}%`;

      whereClauses.push(
        or(
          ilike(candidates.fullName, searchPattern),
          ilike(candidates.headline, searchPattern),
          ilike(candidates.currentCompany, searchPattern),
          ilike(candidates.currentTitle, searchPattern),
          ilike(candidates.email, searchPattern),
          ilike(candidates.skillsText, searchPattern),
        )!,
      );
    }

    if (owner) {
      whereClauses.push(eq(candidates.ownerUserId, owner));
    }

    if (source) {
      whereClauses.push(ilike(candidates.source, `%${source}%`));
    }

    if (location) {
      whereClauses.push(ilike(candidates.location, `%${location}%`));
    }

    if (typeof query.hasResume === "boolean") {
      whereClauses.push(query.hasResume ? resumeExists : sql`not ${resumeExists}`);
    }

    const whereClause = and(...whereClauses);
    const [totalRow] = await db
      .select({ count: countValue })
      .from(candidates)
      .where(whereClause);
    const rows = await db
      .select({
        archivedAt: candidates.archivedAt,
        createdAt: candidates.createdAt,
        currentCompany: candidates.currentCompany,
        currentTitle: candidates.currentTitle,
        email: candidates.email,
        fullName: candidates.fullName,
        hasResume: resumeExists,
        headline: candidates.headline,
        id: candidates.id,
        linkedinUrl: candidates.linkedinUrl,
        location: candidates.location,
        noticePeriod: candidates.noticePeriod,
        owner: {
          email: users.email,
          id: users.id,
          name: users.name,
        },
        ownerUserId: candidates.ownerUserId,
        phone: candidates.phone,
        portfolioUrl: candidates.portfolioUrl,
        salaryExpectation: candidates.salaryExpectation,
        skillsText: candidates.skillsText,
        source: candidates.source,
        summary: candidates.summary,
        updatedAt: candidates.updatedAt,
      })
      .from(candidates)
      .leftJoin(users, eq(candidates.ownerUserId, users.id))
      .where(whereClause)
      .orderBy(desc(candidates.updatedAt), asc(candidates.fullName), asc(candidates.id))
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
        hasResume: query.hasResume ?? null,
        includeArchived: query.includeArchived,
        location,
        owner,
        q,
        source,
      },
      items: rows.map(serializeCandidateRecord),
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

  async getCandidate(
    context: ApiWorkspaceContext,
    candidateId: string,
  ): Promise<CandidateDetailResponse> {
    const candidate = await this.selectCandidateRecord(context, candidateId);

    return this.buildDetailResponse(context, candidate);
  }

  async createCandidate(
    context: ApiWorkspaceContext,
    input: CandidateMutationRequest,
  ): Promise<CandidateMutationResponse> {
    this.assertCanMutateCandidates(context);

    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;
    const ownerUserId = this.resolveOwnerUserId(context, input.ownerUserId);
    const [createdCandidate] = await db
      .insert(candidates)
      .values({
        createdByUserId: actorUserId,
        currentCompany: input.currentCompany ?? null,
        currentTitle: input.currentTitle ?? null,
        email: input.email ?? null,
        fullName: input.fullName,
        headline: input.headline ?? null,
        linkedinUrl: input.linkedinUrl ?? null,
        location: input.location ?? null,
        noticePeriod: input.noticePeriod ?? null,
        ownerUserId,
        phone: input.phone ?? null,
        portfolioUrl: input.portfolioUrl ?? null,
        salaryExpectation: input.salaryExpectation ?? null,
        skillsText: input.skillsText ?? null,
        source: input.source,
        workspaceId,
      })
      .returning({ id: candidates.id });

    if (!createdCandidate) {
      throw new NotFoundException("Failed to create candidate");
    }

    await writeAuditLog({
      action: AuditAction.CANDIDATE_CREATED,
      actorRole: context.membership.role,
      actorUserId,
      entityId: createdCandidate.id,
      entityType: "candidate",
      metadata: {
        candidateName: input.fullName,
        ownerUserId,
        source: input.source,
      },
      source: "api",
      workspaceId,
    });

    const candidate = await this.selectCandidateRecord(
      context,
      createdCandidate.id,
    );

    return {
      ...this.buildDetailResponse(context, candidate),
      message: "Candidate created successfully",
    };
  }

  async updateCandidate(
    context: ApiWorkspaceContext,
    candidateId: string,
    input: CandidateMutationRequest,
  ): Promise<CandidateMutationResponse> {
    this.assertCanMutateCandidates(context);

    const existingCandidate = await this.selectCandidateRecord(
      context,
      candidateId,
    );
    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;
    const ownerUserId = this.resolveOwnerUserId(context, input.ownerUserId);
    const nextValues = {
      currentCompany: input.currentCompany ?? null,
      currentTitle: input.currentTitle ?? null,
      email: input.email ?? null,
      fullName: input.fullName,
      headline: input.headline ?? null,
      linkedinUrl: input.linkedinUrl ?? null,
      location: input.location ?? null,
      noticePeriod: input.noticePeriod ?? null,
      ownerUserId,
      phone: input.phone ?? null,
      portfolioUrl: input.portfolioUrl ?? null,
      salaryExpectation: input.salaryExpectation ?? null,
      skillsText: input.skillsText ?? null,
      source: input.source,
    };
    const changedFields = getCandidateChangedFields(
      existingCandidate,
      nextValues,
    );

    await db
      .update(candidates)
      .set({
        ...nextValues,
        updatedAt: new Date(),
      })
      .where(and(
        eq(candidates.id, candidateId),
        eq(candidates.workspaceId, workspaceId),
      ));

    await writeAuditLog({
      action: AuditAction.CANDIDATE_UPDATED,
      actorRole: context.membership.role,
      actorUserId,
      entityId: candidateId,
      entityType: "candidate",
      metadata: {
        candidateName: input.fullName,
        changedFields,
        ownerUserId,
        source: input.source,
      },
      source: "api",
      workspaceId,
    });

    const candidate = await this.selectCandidateRecord(context, candidateId);

    return {
      ...this.buildDetailResponse(context, candidate),
      message: "Candidate updated successfully",
    };
  }
}
