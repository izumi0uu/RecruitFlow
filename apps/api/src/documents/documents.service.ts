import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  and,
  asc,
  desc,
  eq,
  isNull,
  sql,
  type SQL,
} from "drizzle-orm";

import {
  type ApiDocumentEntityType,
  type ApiDocumentType,
  type ApiAutomationStatus,
  type DocumentsListQuery,
  type DocumentsListResponse,
  type DocumentMutationRequest,
  type DocumentMutationResponse,
  type DocumentRecord,
} from "@recruitflow/contracts";

import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";

import {
  AuditAction,
  auditLogs,
  candidates,
  documents,
  jobs,
  submissions,
  users,
} from "@/lib/db/schema";

const countValue = sql<number>`cast(count(${documents.id}) as int)`;
const documentMetadataMutationRestrictedMessage =
  "Document metadata registration is limited to workspace members with coordinator access or higher";

type DocumentRecordRow = {
  createdAt: Date;
  embeddingStatus: ApiAutomationStatus;
  entityId: string | null;
  entityType: string | null;
  id: string;
  mimeType: string | null;
  sizeBytes: number | null;
  sourceFilename: string | null;
  storageKey: string | null;
  summaryStatus: ApiAutomationStatus;
  summaryText: string | null;
  title: string;
  type: ApiDocumentType;
  updatedAt: Date;
  uploadedByEmail?: string | null;
  uploadedByName?: string | null;
  uploadedByUserId: string | null;
};

const serializeDocumentRecord = (row: DocumentRecordRow): DocumentRecord => {
  if (!row.entityId || !row.entityType || !row.sourceFilename || !row.storageKey) {
    throw new NotFoundException("Document metadata is incomplete");
  }

  return {
    createdAt: row.createdAt.toISOString(),
    embeddingStatus: row.embeddingStatus,
    entityId: row.entityId,
    entityType: row.entityType as ApiDocumentEntityType,
    id: row.id,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    sourceFilename: row.sourceFilename,
    storageKey: row.storageKey,
    summaryStatus: row.summaryStatus,
    summaryText: row.summaryText,
    title: row.title,
    type: row.type,
    updatedAt: row.updatedAt.toISOString(),
    uploadedBy:
      row.uploadedByUserId && row.uploadedByEmail
        ? {
            email: row.uploadedByEmail,
            id: row.uploadedByUserId,
            name: row.uploadedByName ?? null,
          }
        : null,
    uploadedByUserId: row.uploadedByUserId,
  };
};

const getWorkspaceUserReference = (
  context: ApiWorkspaceContext,
  userId: string,
) => {
  const member = context.workspace.memberships.find(
    (membership) => membership.userId === userId,
  );

  return member?.user ?? null;
};

@Injectable()
export class DocumentsService {
  private assertCanCreateDocumentMetadata(context: ApiWorkspaceContext) {
    if (
      !["owner", "recruiter", "coordinator"].includes(context.membership.role)
    ) {
      throw new ForbiddenException(documentMetadataMutationRestrictedMessage);
    }
  }

  async listDocuments(
    context: ApiWorkspaceContext,
    query: DocumentsListQuery,
  ): Promise<DocumentsListResponse> {
    const workspaceId = context.workspace.id;
    const page = query.page;
    const pageSize = query.pageSize;
    const offset = (page - 1) * pageSize;
    const whereClauses: SQL[] = [eq(documents.workspaceId, workspaceId)];

    if (query.type) {
      whereClauses.push(eq(documents.type, query.type));
    }

    if (query.entityType) {
      whereClauses.push(eq(documents.entityType, query.entityType));
    }

    if (query.entityId) {
      whereClauses.push(eq(documents.entityId, query.entityId));
    }

    const whereClause = and(...whereClauses);
    const [totalRow] = await db
      .select({ count: countValue })
      .from(documents)
      .where(whereClause);
    const rows = await db
      .select({
        createdAt: documents.createdAt,
        embeddingStatus: documents.embeddingStatus,
        entityId: documents.entityId,
        entityType: documents.entityType,
        id: documents.id,
        mimeType: documents.mimeType,
        sizeBytes: documents.sizeBytes,
        sourceFilename: documents.sourceFilename,
        storageKey: documents.storageKey,
        summaryStatus: documents.summaryStatus,
        summaryText: documents.summaryText,
        title: documents.title,
        type: documents.type,
        updatedAt: documents.updatedAt,
        uploadedByEmail: users.email,
        uploadedByName: users.name,
        uploadedByUserId: documents.uploadedByUserId,
      })
      .from(documents)
      .leftJoin(users, eq(documents.uploadedByUserId, users.id))
      .where(whereClause)
      .orderBy(desc(documents.createdAt), asc(documents.title), asc(documents.id))
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
        entityId: query.entityId ?? null,
        entityType: query.entityType ?? null,
        type: query.type ?? null,
      },
      items: rows.map(serializeDocumentRecord),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
      workspaceScoped: true,
    };
  }

  private async assertLinkedEntityInWorkspace(
    context: ApiWorkspaceContext,
    input: Pick<DocumentMutationRequest, "entityId" | "entityType">,
  ) {
    const workspaceId = context.workspace.id;

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
        return;
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
        return;
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
        return;
      }
    }

    throw new NotFoundException("Linked document entity not found");
  }

  async createDocument(
    context: ApiWorkspaceContext,
    input: DocumentMutationRequest,
  ): Promise<DocumentMutationResponse> {
    this.assertCanCreateDocumentMetadata(context);

    await this.assertLinkedEntityInWorkspace(context, input);

    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;
    const createdDocument = await db.transaction(async (tx) => {
      const [document] = await tx
        .insert(documents)
        .values({
          embeddingStatus: "queued",
          entityId: input.entityId,
          entityType: input.entityType,
          mimeType: input.mimeType ?? null,
          sizeBytes: input.sizeBytes ?? null,
          sourceFilename: input.sourceFilename,
          storageKey: input.storageKey,
          summaryStatus: "queued",
          title: input.title,
          type: input.type,
          uploadedByUserId: actorUserId,
          workspaceId,
        })
        .returning({
          createdAt: documents.createdAt,
          embeddingStatus: documents.embeddingStatus,
          entityId: documents.entityId,
          entityType: documents.entityType,
          id: documents.id,
          mimeType: documents.mimeType,
          sizeBytes: documents.sizeBytes,
          sourceFilename: documents.sourceFilename,
          storageKey: documents.storageKey,
          summaryStatus: documents.summaryStatus,
          summaryText: documents.summaryText,
          title: documents.title,
          type: documents.type,
          updatedAt: documents.updatedAt,
          uploadedByUserId: documents.uploadedByUserId,
        });

      if (!document) {
        throw new NotFoundException("Failed to create document metadata");
      }

      await tx.insert(auditLogs).values({
        action: AuditAction.DOCUMENT_UPLOADED,
        actorUserId,
        entityId: document.id,
        entityType: "document",
        metadataJson: {
          actorRole: context.membership.role,
          documentType: input.type,
          linkedEntityId: input.entityId,
          linkedEntityType: input.entityType,
          source: "api",
          sourceFilename: input.sourceFilename,
          title: input.title,
        },
        workspaceId,
      });

      return document;
    });

    return {
      context: {
        role: context.membership.role,
        workspaceId,
      },
      contractVersion: "phase-1",
      document: {
        ...serializeDocumentRecord(createdDocument),
        uploadedBy: getWorkspaceUserReference(context, actorUserId),
      },
      message: "Document metadata created successfully",
      workspaceScoped: true,
    };
  }
}
