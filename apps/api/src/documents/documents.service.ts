import {
  ForbiddenException,
  HttpException,
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
  type ApiAutomationStatus,
  type ApiDocumentEntityType,
  type ApiDocumentType,
  type DocumentDownloadQuery,
  type DocumentMutationRequest,
  type DocumentMutationResponse,
  type DocumentParams,
  type DocumentRecord,
  type DocumentsExportQuery,
  type DocumentsListQuery,
  type DocumentsListResponse,
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

import {
  resolvePlaceholderDocument,
  type ResolvedDocumentObject,
} from "./document-placeholder-storage";

const countValue = sql<number>`cast(count(${documents.id}) as int)`;
const documentMetadataMutationRestrictedMessage =
  "Document metadata registration is limited to workspace members with coordinator access or higher";
const documentDeliveryRestrictedMessage =
  "Document download is limited to workspace members with coordinator access or higher";
const documentsExportRestrictedMessage =
  "Document export is limited to workspace members with coordinator access or higher";
const documentFileMissingMessage =
  "This document file is not available for download yet.";
const emptyDocumentsExportMessage =
  "No documents match the current filters.";
const csvFormulaRiskPattern = /^[=+\-@]|\t|\r|^[ ]+[=+\-@]/;

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

type DocumentDeliveryResponse = {
  body: Buffer;
  cacheControl: string;
  contentDisposition: string;
  contentType: string;
};

type DocumentIdentity = {
  entityId: string;
  entityType: ApiDocumentEntityType;
  sourceFilename: string;
};

const buildAttachmentDisposition = (fileName: string) => {
  const sanitizedFallback = fileName
    .replace(/[^\x20-\x7e]+/g, "_")
    .replace(/["\\]/g, "_");
  const encodedFileName = encodeURIComponent(fileName);

  return `attachment; filename="${sanitizedFallback}"; filename*=UTF-8''${encodedFileName}`;
};

const buildDocumentExportFileName = () =>
  `documents-export-${new Date().toISOString().slice(0, 10)}.csv`;

const escapeCsvCell = (value: string | number | null) => {
  const rawValue = value == null ? "" : String(value);
  const safeValue = csvFormulaRiskPattern.test(rawValue)
    ? `'${rawValue}`
    : rawValue;

  return `"${safeValue.replace(/"/g, '""')}"`;
};

const buildDocumentsCsv = (rows: DocumentRecordRow[]) => {
  const header = [
    "title",
    "documentType",
    "fileName",
    "deliveryStatus",
    "linkedEntityType",
    "linkedEntityId",
    "mimeType",
    "sizeBytes",
    "uploadedByName",
    "uploadedByEmail",
    "summaryStatus",
    "embeddingStatus",
    "createdAt",
    "updatedAt",
  ];
  const lines = [
    header.join(","),
    ...rows.map((row) => {
      const identity = requireDocumentIdentity(row);
      const deliveryStatus = resolvePlaceholderDocument({
        entityId: identity.entityId,
        entityType: identity.entityType,
        mimeType: row.mimeType,
        sourceFilename: identity.sourceFilename,
        storageKey: row.storageKey,
        summaryText: row.summaryText,
        title: row.title,
        type: row.type,
      })
        ? "available"
        : "missing";

      return [
        row.title,
        row.type,
        identity.sourceFilename,
        deliveryStatus,
        identity.entityType,
        identity.entityId,
        row.mimeType,
        row.sizeBytes,
        row.uploadedByName ?? null,
        row.uploadedByEmail ?? null,
        row.summaryStatus,
        row.embeddingStatus,
        row.createdAt.toISOString(),
        row.updatedAt.toISOString(),
      ]
        .map((value) =>
          escapeCsvCell(
            typeof value === "number" || typeof value === "string"
              ? value
              : null,
          ),
        )
        .join(",");
    }),
  ];

  return Buffer.from(`\uFEFF${lines.join("\r\n")}\r\n`, "utf8");
};

const requireDocumentIdentity = (row: DocumentRecordRow): DocumentIdentity => {
  if (!row.entityId || !row.entityType || !row.sourceFilename) {
    throw new NotFoundException("Document metadata is incomplete");
  }

  return {
    entityId: row.entityId,
    entityType: row.entityType as ApiDocumentEntityType,
    sourceFilename: row.sourceFilename,
  };
};

const serializeDocumentRecord = (row: DocumentRecordRow): DocumentRecord => {
  const identity = requireDocumentIdentity(row);

  return {
    createdAt: row.createdAt.toISOString(),
    deliveryStatus: resolvePlaceholderDocument({
      entityId: identity.entityId,
      entityType: identity.entityType,
      mimeType: row.mimeType,
      sourceFilename: identity.sourceFilename,
      storageKey: row.storageKey,
      summaryText: row.summaryText,
      title: row.title,
      type: row.type,
    })
      ? "available"
      : "missing",
    embeddingStatus: row.embeddingStatus,
    entityId: identity.entityId,
    entityType: identity.entityType,
    id: row.id,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    sourceFilename: identity.sourceFilename,
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

const createWorkspaceDocumentWhereClause = (
  workspaceId: string,
  query: Pick<DocumentsListQuery, "entityId" | "entityType" | "type">,
) => {
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

  return and(...whereClauses);
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

  private assertCanDownloadDocument(context: ApiWorkspaceContext) {
    if (
      !["owner", "recruiter", "coordinator"].includes(context.membership.role)
    ) {
      throw new ForbiddenException(documentDeliveryRestrictedMessage);
    }
  }

  private assertCanExportDocuments(context: ApiWorkspaceContext) {
    if (
      !["owner", "recruiter", "coordinator"].includes(context.membership.role)
    ) {
      throw new ForbiddenException(documentsExportRestrictedMessage);
    }
  }

  private async getDocumentRow(
    workspaceId: string,
    documentId: string,
  ): Promise<DocumentRecordRow | null> {
    const [document] = await db
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
      .where(
        and(
          eq(documents.id, documentId),
          eq(documents.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    return document ?? null;
  }

  private async getFilteredDocumentRows(
    workspaceId: string,
    query: Pick<DocumentsListQuery, "entityId" | "entityType" | "type">,
  ) {
    const whereClause = createWorkspaceDocumentWhereClause(workspaceId, query);

    return db
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
      .orderBy(desc(documents.createdAt), asc(documents.title), asc(documents.id));
  }

  private resolveDocumentObject(
    row: DocumentRecordRow,
  ): ResolvedDocumentObject | null {
    const identity = requireDocumentIdentity(row);

    return resolvePlaceholderDocument({
      entityId: identity.entityId,
      entityType: identity.entityType,
      mimeType: row.mimeType,
      sourceFilename: identity.sourceFilename,
      storageKey: row.storageKey,
      summaryText: row.summaryText,
      title: row.title,
      type: row.type,
    });
  }

  async listDocuments(
    context: ApiWorkspaceContext,
    query: DocumentsListQuery,
  ): Promise<DocumentsListResponse> {
    const workspaceId = context.workspace.id;
    const page = query.page;
    const pageSize = query.pageSize;
    const offset = (page - 1) * pageSize;
    const whereClause = createWorkspaceDocumentWhereClause(workspaceId, query);
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

  async downloadDocument(
    context: ApiWorkspaceContext,
    params: DocumentParams,
    query: DocumentDownloadQuery,
  ): Promise<DocumentDeliveryResponse> {
    this.assertCanDownloadDocument(context);

    const row = await this.getDocumentRow(context.workspace.id, params.documentId);

    if (!row) {
      throw new NotFoundException("Document not found");
    }

    const identity = requireDocumentIdentity(row);
    const resolvedDocument = this.resolveDocumentObject(row);

    if (!resolvedDocument) {
      throw new HttpException(
        {
          code: "DOCUMENT_FILE_MISSING",
          error: documentFileMissingMessage,
        },
        404,
      );
    }

    await db.insert(auditLogs).values({
      action: AuditAction.DOCUMENT_DOWNLOADED,
      actorUserId: context.membership.userId,
      entityId: row.id,
      entityType: "document",
      metadataJson: {
        actorRole: context.membership.role,
        documentType: row.type,
        fileName: identity.sourceFilename,
        linkedEntityId: identity.entityId,
        linkedEntityType: identity.entityType,
        source: "api",
        sourceSurface: query.sourceSurface,
      },
      workspaceId: context.workspace.id,
    });

    return {
      body: resolvedDocument.body,
      cacheControl: "private, no-store",
      contentDisposition: buildAttachmentDisposition(identity.sourceFilename),
      contentType: resolvedDocument.contentType,
    };
  }

  async exportDocuments(
    context: ApiWorkspaceContext,
    query: DocumentsExportQuery,
  ): Promise<DocumentDeliveryResponse> {
    this.assertCanExportDocuments(context);

    const rows = await this.getFilteredDocumentRows(context.workspace.id, query);

    if (rows.length === 0) {
      throw new HttpException(
        {
          code: "RESULT_SET_EMPTY",
          error: emptyDocumentsExportMessage,
        },
        409,
      );
    }

    await db.insert(auditLogs).values({
      action: AuditAction.RESULT_SET_EXPORTED,
      actorUserId: context.membership.userId,
      entityType: "document",
      metadataJson: {
        actorRole: context.membership.role,
        filters: {
          entityId: query.entityId ?? null,
          entityType: query.entityType ?? null,
          type: query.type ?? null,
        },
        module: "documents",
        rowCount: rows.length,
        source: "api",
        sourceSurface: query.sourceSurface,
      },
      workspaceId: context.workspace.id,
    });

    return {
      body: buildDocumentsCsv(rows),
      cacheControl: "private, no-store",
      contentDisposition: buildAttachmentDisposition(
        buildDocumentExportFileName(),
      ),
      contentType: "text/csv; charset=utf-8",
    };
  }
}
