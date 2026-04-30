import { Injectable } from "@nestjs/common";
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
  type JobRecord,
  type JobsListClientOption,
  type JobsListOwnerOption,
  type JobsListQuery,
  type JobsListResponse,
} from "@recruitflow/contracts";

import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";

import {
  clients,
  jobs,
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
  department: string | null;
  employmentType: string | null;
  headcount: number | null;
  id: string;
  intakeSummary: string | null;
  location: string | null;
  openedAt: Date | null;
  owner: JobsListOwnerOption | null;
  ownerUserId: string | null;
  priority: JobRecord["priority"];
  salaryMax: number | null;
  salaryMin: number | null;
  status: JobRecord["status"];
  targetFillDate: Date | null;
  title: string;
  updatedAt: Date;
};

const toIsoString = (date: Date | null) => date?.toISOString() ?? null;

const normalizeTextFilter = (value: string | undefined) => {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
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
        department: jobs.department,
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
}
