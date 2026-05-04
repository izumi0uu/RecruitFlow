import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  ApiNoteEntityType,
  ApiUserReference,
  NoteMutationRequest,
  NoteMutationResponse,
  NoteRecord,
  NotesListQuery,
  NotesListResponse,
} from "@recruitflow/contracts";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import { writeAuditLog } from "@/lib/db/audit";
import {
  AuditAction,
  candidates,
  clients,
  jobs,
  notes,
  submissions,
  users,
} from "@/lib/db/schema";

import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";

const countValue = sql<number>`cast(count(${notes.id}) as int)`;

type LinkedNoteEntity = {
  id: string;
  label: string;
  secondaryLabel: string | null;
  type: ApiNoteEntityType;
};

type NoteRecordRow = {
  actorEmail: string | null;
  actorName: string | null;
  actorUserId: string | null;
  body: string;
  createdAt: Date;
  entityId: string | null;
  entityType: string;
  id: string;
  updatedAt: Date;
  visibility: string;
};

const getActorReference = (row: NoteRecordRow): ApiUserReference | null => {
  if (!row.actorUserId || !row.actorEmail) {
    return null;
  }

  return {
    email: row.actorEmail,
    id: row.actorUserId,
    name: row.actorName,
  };
};

const serializeNoteRecord = (row: NoteRecordRow): NoteRecord => {
  if (!row.entityId) {
    throw new NotFoundException("Note entity link is incomplete");
  }

  return {
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    createdBy: getActorReference(row),
    createdByUserId: row.actorUserId,
    entityId: row.entityId,
    entityType: row.entityType as ApiNoteEntityType,
    id: row.id,
    updatedAt: row.updatedAt.toISOString(),
    visibility: "workspace",
  };
};

const toBodyPreview = (body: string) => {
  const trimmedBody = body.trim();

  return trimmedBody.length > 140
    ? `${trimmedBody.slice(0, 137)}...`
    : trimmedBody;
};

@Injectable()
export class NotesService {
  private async resolveLinkedEntity(
    context: ApiWorkspaceContext,
    input: Pick<NoteMutationRequest, "entityId" | "entityType">,
    options: { allowArchived?: boolean } = {},
  ): Promise<LinkedNoteEntity> {
    const workspaceId = context.workspace.id;
    const allowArchived = options.allowArchived ?? false;

    if (input.entityType === "client") {
      const [client] = await db
        .select({
          id: clients.id,
          industry: clients.industry,
          name: clients.name,
        })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.entityId),
            eq(clients.workspaceId, workspaceId),
            allowArchived ? undefined : isNull(clients.archivedAt),
          ),
        )
        .limit(1);

      if (client) {
        return {
          id: client.id,
          label: client.name,
          secondaryLabel: client.industry,
          type: "client",
        };
      }
    }

    if (input.entityType === "job") {
      const [job] = await db
        .select({
          clientName: clients.name,
          id: jobs.id,
          title: jobs.title,
        })
        .from(jobs)
        .leftJoin(clients, eq(jobs.clientId, clients.id))
        .where(
          and(
            eq(jobs.id, input.entityId),
            eq(jobs.workspaceId, workspaceId),
            allowArchived ? undefined : isNull(jobs.archivedAt),
          ),
        )
        .limit(1);

      if (job) {
        return {
          id: job.id,
          label: job.title,
          secondaryLabel: job.clientName,
          type: "job",
        };
      }
    }

    if (input.entityType === "candidate") {
      const [candidate] = await db
        .select({
          currentCompany: candidates.currentCompany,
          currentTitle: candidates.currentTitle,
          fullName: candidates.fullName,
          id: candidates.id,
        })
        .from(candidates)
        .where(
          and(
            eq(candidates.id, input.entityId),
            eq(candidates.workspaceId, workspaceId),
            allowArchived ? undefined : isNull(candidates.archivedAt),
          ),
        )
        .limit(1);

      if (candidate) {
        return {
          id: candidate.id,
          label: candidate.fullName,
          secondaryLabel:
            [candidate.currentTitle, candidate.currentCompany]
              .filter(Boolean)
              .join(" at ") || null,
          type: "candidate",
        };
      }
    }

    const [submission] = await db
      .select({
        candidateName: candidates.fullName,
        clientName: clients.name,
        id: submissions.id,
        jobTitle: jobs.title,
      })
      .from(submissions)
      .innerJoin(jobs, eq(submissions.jobId, jobs.id))
      .innerJoin(candidates, eq(submissions.candidateId, candidates.id))
      .leftJoin(clients, eq(jobs.clientId, clients.id))
      .where(
        and(
          eq(submissions.id, input.entityId),
          eq(submissions.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (submission && input.entityType === "submission") {
      return {
        id: submission.id,
        label: submission.candidateName,
        secondaryLabel: [submission.clientName, submission.jobTitle]
          .filter(Boolean)
          .join(" / "),
        type: "submission",
      };
    }

    throw new NotFoundException("Linked note entity not found");
  }

  private async selectNoteRecord(
    context: ApiWorkspaceContext,
    noteId: string,
  ): Promise<NoteRecord> {
    const [row] = await db
      .select({
        actorEmail: users.email,
        actorName: users.name,
        actorUserId: notes.createdByUserId,
        body: notes.body,
        createdAt: notes.createdAt,
        entityId: notes.entityId,
        entityType: notes.entityType,
        id: notes.id,
        updatedAt: notes.updatedAt,
        visibility: notes.visibility,
      })
      .from(notes)
      .leftJoin(users, eq(notes.createdByUserId, users.id))
      .where(
        and(eq(notes.workspaceId, context.workspace.id), eq(notes.id, noteId)),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException("Note not found");
    }

    return serializeNoteRecord(row);
  }

  async listNotes(
    context: ApiWorkspaceContext,
    query: NotesListQuery,
  ): Promise<NotesListResponse> {
    await this.resolveLinkedEntity(context, query, { allowArchived: true });

    const page = query.page;
    const pageSize = query.pageSize;
    const offset = (page - 1) * pageSize;
    const whereClause = and(
      eq(notes.workspaceId, context.workspace.id),
      eq(notes.entityType, query.entityType),
      eq(notes.entityId, query.entityId),
      eq(notes.visibility, "workspace"),
    );
    const [totalRow] = await db
      .select({ count: countValue })
      .from(notes)
      .where(whereClause);
    const rows = await db
      .select({
        actorEmail: users.email,
        actorName: users.name,
        actorUserId: notes.createdByUserId,
        body: notes.body,
        createdAt: notes.createdAt,
        entityId: notes.entityId,
        entityType: notes.entityType,
        id: notes.id,
        updatedAt: notes.updatedAt,
        visibility: notes.visibility,
      })
      .from(notes)
      .leftJoin(users, eq(notes.createdByUserId, users.id))
      .where(whereClause)
      .orderBy(desc(notes.createdAt), asc(notes.id))
      .limit(pageSize)
      .offset(offset);
    const totalItems = totalRow?.count ?? 0;

    return {
      context: {
        role: context.membership.role,
        workspaceId: context.workspace.id,
      },
      contractVersion: "phase-1",
      filters: {
        entityId: query.entityId,
        entityType: query.entityType,
      },
      items: rows.map(serializeNoteRecord),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
      workspaceScoped: true,
    };
  }

  async createNote(
    context: ApiWorkspaceContext,
    input: NoteMutationRequest,
  ): Promise<NoteMutationResponse> {
    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;
    const linkedEntity = await this.resolveLinkedEntity(context, input);
    const now = new Date();
    const [note] = await db
      .insert(notes)
      .values({
        body: input.body,
        createdAt: now,
        createdByUserId: actorUserId,
        entityId: linkedEntity.id,
        entityType: linkedEntity.type,
        updatedAt: now,
        visibility: "workspace",
        workspaceId,
      })
      .returning({ id: notes.id });

    if (!note) {
      throw new NotFoundException("Failed to create note");
    }

    await writeAuditLog({
      action: AuditAction.NOTE_ADDED,
      actorRole: context.membership.role,
      actorUserId,
      entityId: note.id,
      entityType: "note",
      metadata: {
        bodyPreview: toBodyPreview(input.body),
        linkedEntityId: linkedEntity.id,
        linkedEntityLabel: linkedEntity.label,
        linkedEntitySecondaryLabel: linkedEntity.secondaryLabel,
        linkedEntityType: linkedEntity.type,
        visibility: "workspace",
      },
      source: "api",
      workspaceId,
    });

    return {
      context: {
        role: context.membership.role,
        workspaceId,
      },
      contractVersion: "phase-1",
      message: "Note added",
      note: await this.selectNoteRecord(context, note.id),
      workspaceScoped: true,
    };
  }
}
