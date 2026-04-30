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
  inArray,
  isNull,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import {
  type ClientArchiveResponse,
  type ClientContactMutationRequest,
  type ClientContactMutationResponse,
  type ClientContactRecord,
  type ClientDetailResponse,
  type ClientMutationRequest,
  type ClientMutationResponse,
  type ClientRecord,
  type ClientRestoreResponse,
  type ClientsListQuery,
  type ClientsListOwnerOption,
  type ClientsListResponse,
} from "@recruitflow/contracts";

import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";

import { writeAuditLog } from "@/lib/db/audit";
import {
  AuditAction,
  clientContacts,
  clients,
  jobs,
  users,
} from "@/lib/db/schema";

const ACTIVE_JOB_STATUSES = ["intake", "open", "on_hold"] as const;
const countValue = sql<number>`cast(count(*) as int)`;
const openJobsCountValue = sql<number>`cast(count(${jobs.id}) as int)`;
const priorityRankValue = sql<number>`case ${clients.priority}
  when 'high' then 3
  when 'medium' then 2
  else 1
end`;

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

type ClientRecordRow = {
  archivedAt: Date | null;
  createdAt: Date;
  hqLocation: string | null;
  id: string;
  industry: string | null;
  lastContactedAt: Date | null;
  name: string;
  notesPreview: string | null;
  openJobsCount: number | null;
  owner: ClientsListOwnerOption | null;
  ownerUserId: string | null;
  priority: ClientRecord["priority"];
  status: ClientRecord["status"];
  updatedAt: Date;
  website: string | null;
};

type ClientContactRow = {
  clientId: string;
  createdAt: Date;
  email: string | null;
  fullName: string;
  id: string;
  isPrimary: boolean;
  lastContactedAt: Date | null;
  linkedinUrl: string | null;
  phone: string | null;
  relationshipType: string | null;
  title: string | null;
  updatedAt: Date;
};

const normalizeTextFilter = (value: string | undefined) => {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
};

const serializeClientRecord = (row: ClientRecordRow): ClientRecord => ({
  ...row,
  archivedAt: toIsoString(row.archivedAt),
  createdAt: row.createdAt.toISOString(),
  lastContactedAt: toIsoString(row.lastContactedAt),
  openJobsCount: Number(row.openJobsCount ?? 0),
  owner: row.owner?.id ? row.owner : null,
  updatedAt: row.updatedAt.toISOString(),
});

const serializeClientContact = (row: ClientContactRow): ClientContactRecord => ({
  ...row,
  createdAt: row.createdAt.toISOString(),
  lastContactedAt: toIsoString(row.lastContactedAt),
  updatedAt: row.updatedAt.toISOString(),
});

const getClientsOrderBy = (sort: ClientsListQuery["sort"]) => {
  switch (sort) {
    case "last_contacted_desc":
      return [
        sql`${clients.lastContactedAt} desc nulls last`,
        asc(clients.name),
        asc(clients.id),
      ];
    case "name_desc":
      return [desc(clients.name), asc(clients.id)];
    case "priority_desc":
      return [desc(priorityRankValue), asc(clients.name), asc(clients.id)];
    case "updated_desc":
      return [desc(clients.updatedAt), asc(clients.name), asc(clients.id)];
    case "name_asc":
    default:
      return [asc(clients.name), asc(clients.id)];
  }
};

const getContactChangedFields = (
  existingContact: ClientContactRecord,
  nextValues: {
    email: string | null;
    fullName: string;
    isPrimary: boolean;
    linkedinUrl: string | null;
    phone: string | null;
    relationshipType: string | null;
    title: string | null;
  },
) =>
  Object.entries(nextValues)
    .filter(
      ([field, value]) =>
        existingContact[field as keyof ClientContactRecord] !== value,
    )
    .map(([field]) => field);

const restrictedClientManagementMessage =
  "Coordinators can edit descriptive client fields but cannot change owner, status, priority, or archive state";

@Injectable()
export class ClientsService {
  private getOwnerOptions(context: ApiWorkspaceContext) {
    return context.workspace.memberships.map((membership) => ({
      email: membership.user.email,
      id: membership.user.id,
      name: membership.user.name,
    }));
  }

  private resolveOwnerUserId(
    context: ApiWorkspaceContext,
    ownerUserId: string | undefined,
    fallbackUserId: string,
  ) {
    const resolvedOwnerUserId = ownerUserId ?? fallbackUserId;
    const ownerBelongsToWorkspace = context.workspace.memberships.some(
      (membership) => membership.userId === resolvedOwnerUserId,
    );

    if (!ownerBelongsToWorkspace) {
      throw new BadRequestException(
        "Client owner must be a member of the current workspace",
      );
    }

    return resolvedOwnerUserId;
  }

  private assertCoordinatorCreateScope(
    context: ApiWorkspaceContext,
    input: ClientMutationRequest,
  ) {
    if (context.membership.role !== "coordinator") {
      return;
    }

    if (
      (input.ownerUserId && input.ownerUserId !== context.membership.userId) ||
      input.status !== "active" ||
      input.priority !== "medium"
    ) {
      throw new ForbiddenException(restrictedClientManagementMessage);
    }
  }

  private assertCoordinatorUpdateScope(
    context: ApiWorkspaceContext,
    existingClient: ClientRecord,
    input: ClientMutationRequest,
  ) {
    if (context.membership.role !== "coordinator") {
      return;
    }

    if (
      (input.ownerUserId && input.ownerUserId !== existingClient.ownerUserId) ||
      input.status !== existingClient.status ||
      input.priority !== existingClient.priority
    ) {
      throw new ForbiddenException(restrictedClientManagementMessage);
    }
  }

  private async selectClientRecord(
    context: ApiWorkspaceContext,
    clientId: string,
  ) {
    const [row] = await db
      .select({
        archivedAt: clients.archivedAt,
        createdAt: clients.createdAt,
        hqLocation: clients.hqLocation,
        id: clients.id,
        industry: clients.industry,
        lastContactedAt: clients.lastContactedAt,
        name: clients.name,
        notesPreview: clients.notesPreview,
        openJobsCount: openJobsCountValue,
        owner: {
          email: users.email,
          id: users.id,
          name: users.name,
        },
        ownerUserId: clients.ownerUserId,
        priority: clients.priority,
        status: clients.status,
        updatedAt: clients.updatedAt,
        website: clients.website,
      })
      .from(clients)
      .leftJoin(users, eq(clients.ownerUserId, users.id))
      .leftJoin(
        jobs,
        and(
          eq(jobs.clientId, clients.id),
          eq(jobs.workspaceId, context.workspace.id),
          inArray(jobs.status, ACTIVE_JOB_STATUSES),
        ),
      )
      .where(
        and(eq(clients.id, clientId), eq(clients.workspaceId, context.workspace.id)),
      )
      .groupBy(clients.id, users.id)
      .limit(1);

    if (!row) {
      throw new NotFoundException("Client not found");
    }

    return serializeClientRecord(row);
  }

  private async selectClientContacts(
    context: ApiWorkspaceContext,
    clientId: string,
  ) {
    const rows = await db
      .select({
        clientId: clientContacts.clientId,
        createdAt: clientContacts.createdAt,
        email: clientContacts.email,
        fullName: clientContacts.fullName,
        id: clientContacts.id,
        isPrimary: clientContacts.isPrimary,
        lastContactedAt: clientContacts.lastContactedAt,
        linkedinUrl: clientContacts.linkedinUrl,
        phone: clientContacts.phone,
        relationshipType: clientContacts.relationshipType,
        title: clientContacts.title,
        updatedAt: clientContacts.updatedAt,
      })
      .from(clientContacts)
      .where(
        and(
          eq(clientContacts.workspaceId, context.workspace.id),
          eq(clientContacts.clientId, clientId),
        ),
      )
      .orderBy(desc(clientContacts.isPrimary), asc(clientContacts.fullName));

    return rows.map(serializeClientContact);
  }

  private async selectClientContact(
    context: ApiWorkspaceContext,
    clientId: string,
    contactId: string,
  ) {
    const contacts = await this.selectClientContacts(context, clientId);
    const contact = contacts.find((candidate) => candidate.id === contactId);

    if (!contact) {
      throw new NotFoundException("Client contact not found");
    }

    return contact;
  }

  private buildDetailResponse(
    context: ApiWorkspaceContext,
    client: ClientRecord,
    contacts: ClientContactRecord[],
  ): ClientDetailResponse {
    return {
      client,
      contacts,
      context: {
        role: context.membership.role,
        workspaceId: context.workspace.id,
      },
      contractVersion: "phase-1",
      ownerOptions: this.getOwnerOptions(context),
      workspaceScoped: true,
    };
  }

  async listClients(
    context: ApiWorkspaceContext,
    query: ClientsListQuery,
  ): Promise<ClientsListResponse> {
    const q = normalizeTextFilter(query.q ?? query.search);
    const owner = query.owner ?? query.ownerUserId ?? null;
    const page = query.page;
    const pageSize = query.pageSize;
    const offset = (page - 1) * pageSize;
    const orderBy = getClientsOrderBy(query.sort);
    const whereClauses: SQL[] = [eq(clients.workspaceId, context.workspace.id)];

    const shouldExcludeArchived =
      !query.includeArchived && query.status !== "archived";

    if (shouldExcludeArchived) {
      whereClauses.push(
        ne(clients.status, "archived"),
        isNull(clients.archivedAt),
      );
    }

    if (q) {
      const searchPattern = `%${q}%`;

      whereClauses.push(
        or(
          ilike(clients.name, searchPattern),
          ilike(clients.industry, searchPattern),
          ilike(clients.hqLocation, searchPattern),
        )!,
      );
    }

    if (query.status) {
      whereClauses.push(eq(clients.status, query.status));
    }

    if (query.priority) {
      whereClauses.push(eq(clients.priority, query.priority));
    }

    if (owner) {
      whereClauses.push(eq(clients.ownerUserId, owner));
    }

    const whereClause = and(...whereClauses);
    const [totalRow] = await db
      .select({ count: countValue })
      .from(clients)
      .where(whereClause);
    const totalItems = totalRow?.count ?? 0;
    const rows = await db
      .select({
        archivedAt: clients.archivedAt,
        createdAt: clients.createdAt,
        hqLocation: clients.hqLocation,
        id: clients.id,
        industry: clients.industry,
        lastContactedAt: clients.lastContactedAt,
        name: clients.name,
        notesPreview: clients.notesPreview,
        openJobsCount: openJobsCountValue,
        owner: {
          email: users.email,
          id: users.id,
          name: users.name,
        },
        ownerUserId: clients.ownerUserId,
        priority: clients.priority,
        status: clients.status,
        updatedAt: clients.updatedAt,
        website: clients.website,
      })
      .from(clients)
      .leftJoin(users, eq(clients.ownerUserId, users.id))
      .leftJoin(
        jobs,
        and(
          eq(jobs.clientId, clients.id),
          eq(jobs.workspaceId, context.workspace.id),
          inArray(jobs.status, ACTIVE_JOB_STATUSES),
        ),
      )
      .where(whereClause)
      .groupBy(clients.id, users.id)
      .orderBy(...orderBy)
      .limit(pageSize)
      .offset(offset);

    return {
      context: {
        role: context.membership.role,
        workspaceId: context.workspace.id,
      },
      contractVersion: "phase-1",
      filters: {
        includeArchived: query.includeArchived,
        owner,
        priority: query.priority ?? null,
        q,
        sort: query.sort,
        status: query.status ?? null,
      },
      items: rows.map(serializeClientRecord),
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

  async getClient(
    context: ApiWorkspaceContext,
    clientId: string,
  ): Promise<ClientDetailResponse> {
    const client = await this.selectClientRecord(context, clientId);
    const contacts = await this.selectClientContacts(context, clientId);

    return this.buildDetailResponse(context, client, contacts);
  }

  async createClient(
    context: ApiWorkspaceContext,
    input: ClientMutationRequest,
  ): Promise<ClientMutationResponse> {
    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;

    this.assertCoordinatorCreateScope(context, input);

    const ownerUserId = this.resolveOwnerUserId(
      context,
      input.ownerUserId,
      actorUserId,
    );

    const [createdClient] = await db
      .insert(clients)
      .values({
        createdByUserId: actorUserId,
        hqLocation: input.hqLocation ?? null,
        industry: input.industry ?? null,
        name: input.name,
        notesPreview: input.notesPreview ?? null,
        ownerUserId,
        priority: input.priority,
        status: input.status,
        website: input.website ?? null,
        workspaceId,
      })
      .returning({ id: clients.id });

    if (!createdClient) {
      throw new NotFoundException("Failed to create client");
    }

    await writeAuditLog({
      action: AuditAction.CLIENT_CREATED,
      actorRole: context.membership.role,
      actorUserId,
      entityId: createdClient.id,
      entityType: "client",
      metadata: {
        clientName: input.name,
        ownerUserId,
        priority: input.priority,
        status: input.status,
      },
      source: "api",
      workspaceId,
    });

    const client = await this.selectClientRecord(context, createdClient.id);
    const contacts = await this.selectClientContacts(context, createdClient.id);

    return {
      ...this.buildDetailResponse(context, client, contacts),
      message: "Client created successfully",
    };
  }

  async updateClient(
    context: ApiWorkspaceContext,
    clientId: string,
    input: ClientMutationRequest,
  ): Promise<ClientMutationResponse> {
    const existingClient = await this.selectClientRecord(context, clientId);
    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;

    this.assertCoordinatorUpdateScope(context, existingClient, input);

    const ownerUserId = this.resolveOwnerUserId(
      context,
      input.ownerUserId,
      existingClient.ownerUserId ?? actorUserId,
    );
    const nextValues = {
      hqLocation: input.hqLocation ?? null,
      industry: input.industry ?? null,
      name: input.name,
      notesPreview: input.notesPreview ?? null,
      ownerUserId,
      priority: input.priority,
      status: input.status,
      updatedAt: new Date(),
      website: input.website ?? null,
    };
    const changedFields = Object.entries(nextValues)
      .filter(([field, value]) => {
        if (field === "updatedAt") {
          return false;
        }

        return existingClient[field as keyof ClientRecord] !== value;
      })
      .map(([field]) => field);

    await db
      .update(clients)
      .set(nextValues)
      .where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId)));

    await writeAuditLog({
      action: AuditAction.CLIENT_UPDATED,
      actorRole: context.membership.role,
      actorUserId,
      entityId: clientId,
      entityType: "client",
      metadata: {
        changedFields,
        clientName: input.name,
        ownerUserId,
        priority: input.priority,
        status: input.status,
      },
      source: "api",
      workspaceId,
    });

    const client = await this.selectClientRecord(context, clientId);
    const contacts = await this.selectClientContacts(context, clientId);

    return {
      ...this.buildDetailResponse(context, client, contacts),
      message: "Client updated successfully",
    };
  }

  async archiveClient(
    context: ApiWorkspaceContext,
    clientId: string,
  ): Promise<ClientArchiveResponse> {
    const existingClient = await this.selectClientRecord(context, clientId);
    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;
    const archivedAt = existingClient.archivedAt
      ? new Date(existingClient.archivedAt)
      : new Date();

    await db
      .update(clients)
      .set({
        archivedAt,
        status: "archived",
        updatedAt: new Date(),
      })
      .where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId)));

    await writeAuditLog({
      action: AuditAction.CLIENT_ARCHIVED,
      actorRole: context.membership.role,
      actorUserId,
      entityId: clientId,
      entityType: "client",
      metadata: {
        clientName: existingClient.name,
        previousStatus: existingClient.status,
      },
      source: "api",
      workspaceId,
    });

    const client = await this.selectClientRecord(context, clientId);
    const contacts = await this.selectClientContacts(context, clientId);

    return {
      ...this.buildDetailResponse(context, client, contacts),
      archived: true,
      message: "Client archived successfully",
    };
  }

  async restoreClient(
    context: ApiWorkspaceContext,
    clientId: string,
  ): Promise<ClientRestoreResponse> {
    const existingClient = await this.selectClientRecord(context, clientId);
    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;

    if (existingClient.status !== "archived" && !existingClient.archivedAt) {
      throw new BadRequestException("Client is not archived");
    }

    await db
      .update(clients)
      .set({
        archivedAt: null,
        status: "active",
        updatedAt: new Date(),
      })
      .where(and(eq(clients.id, clientId), eq(clients.workspaceId, workspaceId)));

    await writeAuditLog({
      action: AuditAction.CLIENT_RESTORED,
      actorRole: context.membership.role,
      actorUserId,
      entityId: clientId,
      entityType: "client",
      metadata: {
        archivedAt: existingClient.archivedAt,
        clientName: existingClient.name,
        nextStatus: "active",
        previousStatus: existingClient.status,
      },
      source: "api",
      workspaceId,
    });

    const client = await this.selectClientRecord(context, clientId);
    const contacts = await this.selectClientContacts(context, clientId);

    return {
      ...this.buildDetailResponse(context, client, contacts),
      message: "Client restored successfully",
      restored: true,
    };
  }

  async createClientContact(
    context: ApiWorkspaceContext,
    clientId: string,
    input: ClientContactMutationRequest,
  ): Promise<ClientContactMutationResponse> {
    await this.selectClientRecord(context, clientId);

    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;
    const existingContacts = await this.selectClientContacts(context, clientId);
    const shouldMarkPrimary = input.isPrimary || existingContacts.length === 0;
    const [createdContact] = await db.transaction(async (tx) => {
      if (shouldMarkPrimary) {
        await tx
          .update(clientContacts)
          .set({ isPrimary: false, updatedAt: new Date() })
          .where(
            and(
              eq(clientContacts.workspaceId, workspaceId),
              eq(clientContacts.clientId, clientId),
            ),
          );
      }

      return tx
        .insert(clientContacts)
        .values({
          clientId,
          email: input.email ?? null,
          fullName: input.fullName,
          isPrimary: shouldMarkPrimary,
          linkedinUrl: input.linkedinUrl ?? null,
          phone: input.phone ?? null,
          relationshipType: input.relationshipType ?? null,
          title: input.title ?? null,
          workspaceId,
        })
        .returning({ id: clientContacts.id });
    });

    if (!createdContact) {
      throw new NotFoundException("Failed to create client contact");
    }

    await writeAuditLog({
      action: AuditAction.CLIENT_CONTACT_CREATED,
      actorRole: context.membership.role,
      actorUserId,
      entityId: createdContact.id,
      entityType: "client_contact",
      metadata: {
        clientId,
        contactName: input.fullName,
        isPrimary: shouldMarkPrimary,
      },
      source: "api",
      workspaceId,
    });

    const contacts = await this.selectClientContacts(context, clientId);
    const contact = contacts.find((candidate) => candidate.id === createdContact.id);

    if (!contact) {
      throw new NotFoundException("Client contact not found");
    }

    return {
      contact,
      contacts,
      context: {
        role: context.membership.role,
        workspaceId,
      },
      contractVersion: "phase-1",
      message: "Client contact created successfully",
      workspaceScoped: true,
    };
  }

  async updateClientContact(
    context: ApiWorkspaceContext,
    clientId: string,
    contactId: string,
    input: ClientContactMutationRequest,
  ): Promise<ClientContactMutationResponse> {
    await this.selectClientRecord(context, clientId);

    const existingContact = await this.selectClientContact(
      context,
      clientId,
      contactId,
    );
    const workspaceId = context.workspace.id;
    const actorUserId = context.membership.userId;
    const nextValues = {
      email: input.email ?? null,
      fullName: input.fullName,
      isPrimary: input.isPrimary,
      linkedinUrl: input.linkedinUrl ?? null,
      phone: input.phone ?? null,
      relationshipType: input.relationshipType ?? null,
      title: input.title ?? null,
    };
    const changedFields = getContactChangedFields(existingContact, nextValues);

    await db.transaction(async (tx) => {
      if (input.isPrimary) {
        await tx
          .update(clientContacts)
          .set({ isPrimary: false, updatedAt: new Date() })
          .where(
            and(
              eq(clientContacts.workspaceId, workspaceId),
              eq(clientContacts.clientId, clientId),
              ne(clientContacts.id, contactId),
            ),
          );
      }

      await tx
        .update(clientContacts)
        .set({
          ...nextValues,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(clientContacts.workspaceId, workspaceId),
            eq(clientContacts.clientId, clientId),
            eq(clientContacts.id, contactId),
          ),
        );
    });

    await writeAuditLog({
      action: AuditAction.CLIENT_CONTACT_UPDATED,
      actorRole: context.membership.role,
      actorUserId,
      entityId: contactId,
      entityType: "client_contact",
      metadata: {
        changedFields,
        clientId,
        contactName: input.fullName,
        isPrimary: input.isPrimary,
      },
      source: "api",
      workspaceId,
    });

    const contacts = await this.selectClientContacts(context, clientId);
    const contact = contacts.find((candidate) => candidate.id === contactId);

    if (!contact) {
      throw new NotFoundException("Client contact not found");
    }

    return {
      contact,
      contacts,
      context: {
        role: context.membership.role,
        workspaceId,
      },
      contractVersion: "phase-1",
      message: "Client contact updated successfully",
      workspaceScoped: true,
    };
  }
}
