import { Injectable } from "@nestjs/common";
import {
  and,
  asc,
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
  type ClientsListQuery,
  type ClientsListResponse,
} from "@recruitflow/contracts";

import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";

import {
  clients,
  jobs,
  users,
} from "@/lib/db/schema";

const ACTIVE_JOB_STATUSES = ["intake", "open", "on_hold"] as const;
const countValue = sql<number>`cast(count(*) as int)`;
const openJobsCountValue = sql<number>`cast(count(${jobs.id}) as int)`;

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const normalizeTextFilter = (value: string | undefined) => {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
};

@Injectable()
export class ClientsService {
  async listClients(
    context: ApiWorkspaceContext,
    query: ClientsListQuery,
  ): Promise<ClientsListResponse> {
    const q = normalizeTextFilter(query.q ?? query.search);
    const owner = query.owner ?? query.ownerUserId ?? null;
    const page = query.page;
    const pageSize = query.pageSize;
    const offset = (page - 1) * pageSize;
    const whereClauses: SQL[] = [eq(clients.workspaceId, context.workspace.id)];

    if (!query.includeArchived) {
      whereClauses.push(ne(clients.status, "archived"), isNull(clients.archivedAt));
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
      .orderBy(asc(clients.name), asc(clients.id))
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
        status: query.status ?? null,
      },
      items: rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        lastContactedAt: toIsoString(row.lastContactedAt),
        openJobsCount: Number(row.openJobsCount ?? 0),
        owner: row.owner?.id ? row.owner : null,
        updatedAt: row.updatedAt.toISOString(),
      })),
      ownerOptions: context.workspace.memberships.map((membership) => ({
        email: membership.user.email,
        id: membership.user.id,
        name: membership.user.name,
      })),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
      workspaceScoped: true,
    };
  }
}
