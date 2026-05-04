import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  ActivityTimelineEntityReference,
  ActivityTimelineEvent,
  ActivityTimelineEventMetadata,
  ActivityTimelineQuery,
  ActivityTimelineResponse,
  ApiActivityTimelineEntityType,
  ApiActivityTimelineEventType,
  ApiUserReference,
} from "@recruitflow/contracts";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  auditLogs,
  candidates,
  clients,
  documents,
  jobs,
  notes,
  submissions,
  tasks,
  users,
} from "@/lib/db/schema";
import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";

const auditActors = alias(users, "activity_audit_actors");
const noteActors = alias(users, "activity_note_actors");
const noteArchiveActors = alias(users, "activity_note_archive_actors");
const scopeJobs = alias(jobs, "activity_scope_jobs");
const scopeSubmissions = alias(submissions, "activity_scope_submissions");
const scopeSubmissionJobs = alias(jobs, "activity_scope_submission_jobs");
const scopeSubmissionClients = alias(
  clients,
  "activity_scope_submission_clients",
);
const scopeSubmissionCandidates = alias(
  candidates,
  "activity_scope_submission_candidates",
);

const eventTypeToneMap: Record<
  ApiActivityTimelineEventType,
  ActivityTimelineEvent["tone"]
> = {
  document: "accent",
  member: "strong",
  note: "strong",
  record: "muted",
  submission: "secondary",
  task: "primary",
};

type MetadataRecord = Record<string, unknown>;

type AuditTimelineRow = {
  action: string;
  actorEmail: string | null;
  actorName: string | null;
  actorUserId: string | null;
  createdAt: Date;
  entityId: string | null;
  entityType: string | null;
  id: string;
  metadataJson: unknown;
};

type TaskScopeRow = {
  dueAt: Date | null;
  entityId: string | null;
  entityType: string | null;
  id: string;
  snoozedUntil: Date | null;
  status: string;
  submissionId: string | null;
  title: string;
};

type DocumentScopeRow = {
  entityId: string | null;
  entityType: string | null;
  id: string;
  sourceFilename: string | null;
  title: string;
  type: string;
};

type SubmissionScopeRow = {
  candidateId: string;
  candidateName: string;
  clientName: string | null;
  id: string;
  jobId: string;
  jobTitle: string;
  stage: string;
};

type NoteTimelineRow = {
  actorEmail: string | null;
  actorName: string | null;
  actorUserId: string | null;
  archivedAt: Date | null;
  archivedByEmail: string | null;
  archivedByName: string | null;
  archivedByUserId: string | null;
  body: string;
  createdAt: Date;
  entityId: string | null;
  entityType: string;
  id: string;
};

type TimelineScope = {
  candidateIds: string[];
  documentRows: DocumentScopeRow[];
  jobIds: string[];
  submissionRows: SubmissionScopeRow[];
  target: ActivityTimelineEntityReference & {
    id: string;
    type: ApiActivityTimelineEntityType;
  };
  taskRows: TaskScopeRow[];
};

const emptyCounts = (): Record<ApiActivityTimelineEventType, number> => ({
  document: 0,
  member: 0,
  note: 0,
  record: 0,
  submission: 0,
  task: 0,
});

const isRecord = (value: unknown): value is MetadataRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getString = (metadata: MetadataRecord, key: string) => {
  const value = metadata[key];

  return typeof value === "string" && value.trim() ? value : null;
};

const getStringArray = (metadata: MetadataRecord, key: string) => {
  const value = metadata[key];

  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
};

const unique = (items: Array<string | null | undefined>) =>
  Array.from(new Set(items.filter((item): item is string => Boolean(item))));

const compact = (items: Array<string | null | undefined>) =>
  items.filter((item): item is string => Boolean(item?.trim()));

const pushClause = (clauses: SQL[], clause: SQL | undefined) => {
  if (clause) {
    clauses.push(clause);
  }
};

const humanizeToken = (value: string | null | undefined) => {
  if (!value) {
    return "Unknown";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const formatList = (values: string[]) =>
  values.map((value) => humanizeToken(value)).join(", ");

const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(date);
};

const toDeletedNotePreview = (body: string) => {
  const trimmedBody = body.trim();

  return trimmedBody.length > 140
    ? `${trimmedBody.slice(0, 137)}...`
    : trimmedBody;
};

const createReference = ({
  href,
  id,
  label,
  secondaryLabel = null,
  type,
}: {
  href: string | null;
  id: string | null;
  label: string;
  secondaryLabel?: string | null;
  type: string;
}): ActivityTimelineEntityReference => ({
  href,
  id,
  label,
  secondaryLabel,
  type,
});

const buildTaskListHref = (task: TaskScopeRow | undefined) => {
  const params = new URLSearchParams({ view: "workspace" });

  if (task?.entityId && task.entityType) {
    params.set("entityType", task.entityType);
    params.set("entityId", task.entityId);
  }

  return `/tasks?${params.toString()}`;
};

const buildDocumentListHref = (document: DocumentScopeRow | undefined) => {
  const params = new URLSearchParams();

  if (document?.entityId && document.entityType) {
    params.set("entityType", document.entityType);
    params.set("entityId", document.entityId);
  }

  const queryString = params.toString();

  return `/documents${queryString ? `?${queryString}` : ""}`;
};

const buildSubmissionHref = (
  submission: Pick<SubmissionScopeRow, "candidateId" | "jobId"> | undefined,
) => {
  if (!submission) {
    return "/pipeline?view=list";
  }

  const params = new URLSearchParams({
    candidateId: submission.candidateId,
    jobId: submission.jobId,
    view: "list",
  });

  return `/pipeline?${params.toString()}`;
};

const getActorReference = (row: {
  actorEmail: string | null;
  actorName: string | null;
  actorUserId: string | null;
}): ApiUserReference | null => {
  if (!row.actorUserId || !row.actorEmail) {
    return null;
  }

  return {
    email: row.actorEmail,
    id: row.actorUserId,
    name: row.actorName,
  };
};

const getEventType = (action: string): ApiActivityTimelineEventType => {
  if (action.startsWith("TASK_")) return "task";
  if (action.startsWith("SUBMISSION_")) return "submission";
  if (action.startsWith("DOCUMENT_")) return "document";
  if (action.startsWith("NOTE_")) return "note";
  if (action.startsWith("MEMBER_")) return "member";

  return "record";
};

const getActionTitle = (action: string) => {
  switch (action) {
    case "CLIENT_CREATED":
      return "Client created";
    case "CLIENT_UPDATED":
      return "Client updated";
    case "CLIENT_ARCHIVED":
      return "Client archived";
    case "CLIENT_RESTORED":
      return "Client restored";
    case "CLIENT_CONTACT_CREATED":
      return "Contact added";
    case "CLIENT_CONTACT_UPDATED":
      return "Contact updated";
    case "JOB_CREATED":
      return "Job created";
    case "JOB_UPDATED":
      return "Job updated";
    case "JOB_STATUS_CHANGED":
      return "Job status changed";
    case "JOB_STAGE_TEMPLATE_INITIALIZED":
      return "Stage template initialized";
    case "CANDIDATE_CREATED":
      return "Candidate created";
    case "CANDIDATE_UPDATED":
      return "Candidate updated";
    case "DOCUMENT_LINKED":
      return "Document linked";
    case "DOCUMENT_UPLOADED":
      return "Document uploaded";
    case "MEMBER_INVITED":
      return "Member invited";
    case "MEMBER_JOINED":
      return "Member joined";
    case "MEMBER_REMOVED":
      return "Member removed";
    case "SUBMISSION_CREATED":
      return "Submission created";
    case "SUBMISSION_STAGE_CHANGED":
      return "Stage moved";
    case "SUBMISSION_RISK_UPDATED":
      return "Risk updated";
    case "SUBMISSION_NEXT_STEP_UPDATED":
      return "Next step updated";
    case "TASK_CREATED":
      return "Task created";
    case "TASK_UPDATED":
      return "Task updated";
    case "TASK_COMPLETED":
      return "Task completed";
    case "TASK_SNOOZED":
      return "Task snoozed";
    case "TASK_REOPENED":
      return "Task reopened";
    case "TASK_PERMISSION_DENIED":
      return "Task action blocked";
    case "NOTE_ARCHIVED":
      return "Note deleted";
    case "NOTE_DELETED":
      return "Deleted note hidden";
    case "NOTE_PERMISSION_DENIED":
      return "Note action blocked";
    default:
      return humanizeToken(action);
  }
};

const getAuditDescription = (
  row: AuditTimelineRow,
  entity: ActivityTimelineEntityReference | null,
) => {
  const metadata = isRecord(row.metadataJson) ? row.metadataJson : {};
  const changedFields = getStringArray(metadata, "changedFields");

  switch (row.action) {
    case "SUBMISSION_STAGE_CHANGED": {
      const fromStage = getString(metadata, "fromStage");
      const toStage = getString(metadata, "toStage");

      return fromStage && toStage
        ? `${humanizeToken(fromStage)} -> ${humanizeToken(toStage)}`
        : (entity?.label ?? null);
    }
    case "JOB_STATUS_CHANGED": {
      const fromStatus = getString(metadata, "from");
      const toStatus = getString(metadata, "to");

      return fromStatus && toStatus
        ? `${humanizeToken(fromStatus)} -> ${humanizeToken(toStatus)}`
        : (entity?.label ?? null);
    }
    case "SUBMISSION_RISK_UPDATED": {
      const fromRisk = getString(metadata, "fromRiskFlag");
      const toRisk = getString(metadata, "toRiskFlag");

      return fromRisk && toRisk
        ? `${humanizeToken(fromRisk)} -> ${humanizeToken(toRisk)}`
        : (entity?.label ?? null);
    }
    case "SUBMISSION_NEXT_STEP_UPDATED":
      return getString(metadata, "toNextStep") ?? entity?.label ?? null;
    case "TASK_SNOOZED":
      return compact([
        entity?.label,
        formatDateTime(getString(metadata, "snoozedUntil")),
      ]).join(" · ");
    case "TASK_PERMISSION_DENIED":
    case "NOTE_PERMISSION_DENIED":
      return getString(metadata, "reason") ?? entity?.label ?? null;
    case "DOCUMENT_UPLOADED":
    case "DOCUMENT_LINKED":
      return (
        getString(metadata, "sourceFilename") ??
        getString(metadata, "title") ??
        entity?.label ??
        null
      );
    case "CLIENT_CONTACT_CREATED":
    case "CLIENT_CONTACT_UPDATED":
      return getString(metadata, "contactName") ?? entity?.label ?? null;
    case "TASK_UPDATED":
    case "CLIENT_UPDATED":
    case "JOB_UPDATED":
    case "CANDIDATE_UPDATED":
      return changedFields.length > 0
        ? `Changed ${formatList(changedFields)}`
        : (entity?.label ?? null);
    default:
      return entity?.label ?? null;
  }
};

const getAuditMetadata = (
  row: AuditTimelineRow,
): ActivityTimelineEventMetadata[] => {
  const metadata = isRecord(row.metadataJson) ? row.metadataJson : {};
  const entries: ActivityTimelineEventMetadata[] = [];
  const changedFields = getStringArray(metadata, "changedFields");
  const fromStage = getString(metadata, "fromStage");
  const toStage = getString(metadata, "toStage");
  const fromStatus = getString(metadata, "from");
  const toStatus = getString(metadata, "to");
  const previousStatus = getString(metadata, "previousStatus");
  const nextStatus = getString(metadata, "nextStatus");
  const documentType = getString(metadata, "documentType");
  const sourceFilename = getString(metadata, "sourceFilename");
  const snoozedUntil = formatDateTime(getString(metadata, "snoozedUntil"));

  if (fromStage && toStage) {
    entries.push({
      label: "Stage",
      value: `${humanizeToken(fromStage)} -> ${humanizeToken(toStage)}`,
    });
  }

  if (fromStatus && toStatus) {
    entries.push({
      label: "Status",
      value: `${humanizeToken(fromStatus)} -> ${humanizeToken(toStatus)}`,
    });
  }

  if (previousStatus && nextStatus) {
    entries.push({
      label: "Status",
      value: `${humanizeToken(previousStatus)} -> ${humanizeToken(nextStatus)}`,
    });
  }

  if (snoozedUntil) {
    entries.push({ label: "Returns", value: snoozedUntil });
  }

  if (changedFields.length > 0) {
    entries.push({ label: "Fields", value: formatList(changedFields) });
  }

  if (documentType) {
    entries.push({ label: "Type", value: humanizeToken(documentType) });
  }

  if (sourceFilename) {
    entries.push({ label: "File", value: sourceFilename });
  }

  return entries.slice(0, 3);
};

@Injectable()
export class ActivityService {
  private async getTargetReference(
    context: ApiWorkspaceContext,
    query: ActivityTimelineQuery,
  ) {
    const workspaceId = context.workspace.id;

    if (query.entityType === "workspace") {
      if (query.entityId !== workspaceId) {
        throw new NotFoundException("Timeline workspace not found");
      }

      return createReference({
        href: "/settings/activity",
        id: context.workspace.id,
        label: context.workspace.name,
        secondaryLabel: "Workspace",
        type: "workspace",
      }) as TimelineScope["target"];
    }

    if (query.entityType === "client") {
      const [client] = await db
        .select({
          id: clients.id,
          industry: clients.industry,
          name: clients.name,
        })
        .from(clients)
        .where(
          and(
            eq(clients.id, query.entityId),
            eq(clients.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      if (!client) {
        throw new NotFoundException("Timeline client not found");
      }

      return createReference({
        href: `/clients/${client.id}`,
        id: client.id,
        label: client.name,
        secondaryLabel: client.industry,
        type: "client",
      }) as TimelineScope["target"];
    }

    if (query.entityType === "job") {
      const [job] = await db
        .select({
          clientName: clients.name,
          id: jobs.id,
          title: jobs.title,
        })
        .from(jobs)
        .leftJoin(clients, eq(jobs.clientId, clients.id))
        .where(
          and(eq(jobs.id, query.entityId), eq(jobs.workspaceId, workspaceId)),
        )
        .limit(1);

      if (!job) {
        throw new NotFoundException("Timeline job not found");
      }

      return createReference({
        href: `/jobs/${job.id}`,
        id: job.id,
        label: job.title,
        secondaryLabel: job.clientName,
        type: "job",
      }) as TimelineScope["target"];
    }

    if (query.entityType === "candidate") {
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
            eq(candidates.id, query.entityId),
            eq(candidates.workspaceId, workspaceId),
          ),
        )
        .limit(1);

      if (!candidate) {
        throw new NotFoundException("Timeline candidate not found");
      }

      return createReference({
        href: `/candidates/${candidate.id}`,
        id: candidate.id,
        label: candidate.fullName,
        secondaryLabel:
          compact([candidate.currentTitle, candidate.currentCompany]).join(
            " at ",
          ) || null,
        type: "candidate",
      }) as TimelineScope["target"];
    }

    const [submission] = await db
      .select({
        candidateId: submissions.candidateId,
        candidateName: candidates.fullName,
        clientName: clients.name,
        id: submissions.id,
        jobId: submissions.jobId,
        jobTitle: jobs.title,
      })
      .from(submissions)
      .innerJoin(jobs, eq(submissions.jobId, jobs.id))
      .innerJoin(candidates, eq(submissions.candidateId, candidates.id))
      .leftJoin(clients, eq(jobs.clientId, clients.id))
      .where(
        and(
          eq(submissions.id, query.entityId),
          eq(submissions.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!submission) {
      throw new NotFoundException("Timeline submission not found");
    }

    return createReference({
      href: buildSubmissionHref(submission),
      id: submission.id,
      label: submission.candidateName,
      secondaryLabel: compact([
        submission.clientName,
        submission.jobTitle,
      ]).join(" / "),
      type: "submission",
    }) as TimelineScope["target"];
  }

  private async getSubmissionRows(
    context: ApiWorkspaceContext,
    query: ActivityTimelineQuery,
  ): Promise<SubmissionScopeRow[]> {
    const workspaceId = context.workspace.id;
    const whereClauses: SQL[] = [eq(scopeSubmissions.workspaceId, workspaceId)];

    if (query.entityType === "submission") {
      whereClauses.push(eq(scopeSubmissions.id, query.entityId));
    } else if (query.entityType === "job") {
      whereClauses.push(eq(scopeSubmissions.jobId, query.entityId));
    } else if (query.entityType === "candidate") {
      whereClauses.push(eq(scopeSubmissions.candidateId, query.entityId));
    } else if (query.entityType === "client") {
      whereClauses.push(eq(scopeSubmissionJobs.clientId, query.entityId));
    } else {
      return [];
    }

    return db
      .select({
        candidateId: scopeSubmissions.candidateId,
        candidateName: scopeSubmissionCandidates.fullName,
        clientName: scopeSubmissionClients.name,
        id: scopeSubmissions.id,
        jobId: scopeSubmissions.jobId,
        jobTitle: scopeSubmissionJobs.title,
        stage: scopeSubmissions.stage,
      })
      .from(scopeSubmissions)
      .innerJoin(
        scopeSubmissionJobs,
        eq(scopeSubmissions.jobId, scopeSubmissionJobs.id),
      )
      .innerJoin(
        scopeSubmissionCandidates,
        eq(scopeSubmissions.candidateId, scopeSubmissionCandidates.id),
      )
      .leftJoin(
        scopeSubmissionClients,
        eq(scopeSubmissionJobs.clientId, scopeSubmissionClients.id),
      )
      .where(and(...whereClauses))
      .orderBy(desc(scopeSubmissions.updatedAt), asc(scopeSubmissions.id))
      .limit(200);
  }

  private async getJobIdsForClient(
    context: ApiWorkspaceContext,
    query: ActivityTimelineQuery,
  ) {
    if (query.entityType !== "client") {
      return query.entityType === "job" ? [query.entityId] : [];
    }

    const rows = await db
      .select({ id: scopeJobs.id })
      .from(scopeJobs)
      .where(
        and(
          eq(scopeJobs.workspaceId, context.workspace.id),
          eq(scopeJobs.clientId, query.entityId),
          isNull(scopeJobs.archivedAt),
        ),
      )
      .limit(200);

    return rows.map((row) => row.id);
  }

  private async getTaskRows(
    context: ApiWorkspaceContext,
    query: ActivityTimelineQuery,
    submissionIds: string[],
  ) {
    const clauses: SQL[] = [];

    pushClause(
      clauses,
      and(
        eq(tasks.entityType, query.entityType),
        eq(tasks.entityId, query.entityId),
      ),
    );

    if (submissionIds.length > 0) {
      clauses.push(inArray(tasks.submissionId, submissionIds));
      pushClause(
        clauses,
        and(
          eq(tasks.entityType, "submission"),
          inArray(tasks.entityId, submissionIds),
        ),
      );
    }

    const whereClause = or(...clauses);

    if (!whereClause) {
      return [];
    }

    return db
      .select({
        dueAt: tasks.dueAt,
        entityId: tasks.entityId,
        entityType: tasks.entityType,
        id: tasks.id,
        snoozedUntil: tasks.snoozedUntil,
        status: tasks.status,
        submissionId: tasks.submissionId,
        title: tasks.title,
      })
      .from(tasks)
      .where(and(eq(tasks.workspaceId, context.workspace.id), whereClause))
      .orderBy(desc(tasks.updatedAt), asc(tasks.id))
      .limit(200);
  }

  private async getDocumentRows(
    context: ApiWorkspaceContext,
    query: ActivityTimelineQuery,
    scope: Pick<TimelineScope, "jobIds" | "submissionRows">,
  ) {
    const submissionIds = scope.submissionRows.map(
      (submission) => submission.id,
    );
    const clauses: SQL[] = [];

    pushClause(
      clauses,
      and(
        eq(documents.entityType, query.entityType),
        eq(documents.entityId, query.entityId),
      ),
    );

    if (query.entityType === "candidate") {
      pushClause(
        clauses,
        and(
          eq(documents.entityType, "candidate"),
          eq(documents.entityId, query.entityId),
        ),
      );
    }

    if (scope.jobIds.length > 0) {
      pushClause(
        clauses,
        and(
          eq(documents.entityType, "job"),
          inArray(documents.entityId, scope.jobIds),
        ),
      );
    }

    if (submissionIds.length > 0) {
      pushClause(
        clauses,
        and(
          eq(documents.entityType, "submission"),
          inArray(documents.entityId, submissionIds),
        ),
      );
    }

    const whereClause = or(...clauses);

    if (!whereClause) {
      return [];
    }

    return db
      .select({
        entityId: documents.entityId,
        entityType: documents.entityType,
        id: documents.id,
        sourceFilename: documents.sourceFilename,
        title: documents.title,
        type: documents.type,
      })
      .from(documents)
      .where(and(eq(documents.workspaceId, context.workspace.id), whereClause))
      .orderBy(desc(documents.createdAt), asc(documents.id))
      .limit(200);
  }

  private async getScope(
    context: ApiWorkspaceContext,
    query: ActivityTimelineQuery,
  ): Promise<TimelineScope> {
    const [target, submissionRows, directJobIds] = await Promise.all([
      this.getTargetReference(context, query),
      this.getSubmissionRows(context, query),
      this.getJobIdsForClient(context, query),
    ]);
    const jobIds = unique([
      ...directJobIds,
      ...submissionRows.map((submission) => submission.jobId),
    ]);
    const candidateIds = unique(
      query.entityType === "candidate"
        ? [
            query.entityId,
            ...submissionRows.map((submission) => submission.candidateId),
          ]
        : submissionRows.map((submission) => submission.candidateId),
    );
    const taskRows = await this.getTaskRows(
      context,
      query,
      submissionRows.map((submission) => submission.id),
    );
    const documentRows = await this.getDocumentRows(context, query, {
      jobIds,
      submissionRows,
    });

    return {
      candidateIds,
      documentRows,
      jobIds,
      submissionRows,
      target,
      taskRows,
    };
  }

  private getAuditWhereClauses(
    query: ActivityTimelineQuery,
    scope: TimelineScope,
  ) {
    const clauses: SQL[] = [];
    const submissionIds = scope.submissionRows.map(
      (submission) => submission.id,
    );
    const taskIds = scope.taskRows.map((task) => task.id);
    const documentIds = scope.documentRows.map((document) => document.id);

    pushClause(
      clauses,
      and(
        eq(auditLogs.entityType, query.entityType),
        eq(auditLogs.entityId, query.entityId),
      ),
    );

    if (submissionIds.length > 0) {
      pushClause(
        clauses,
        and(
          eq(auditLogs.entityType, "submission"),
          inArray(auditLogs.entityId, submissionIds),
        ),
      );
    }

    if (taskIds.length > 0) {
      pushClause(
        clauses,
        and(
          eq(auditLogs.entityType, "task"),
          inArray(auditLogs.entityId, taskIds),
        ),
      );
    }

    if (documentIds.length > 0) {
      pushClause(
        clauses,
        and(
          eq(auditLogs.entityType, "document"),
          inArray(auditLogs.entityId, documentIds),
        ),
      );
    }

    if (query.entityType === "client") {
      pushClause(
        clauses,
        and(
          eq(auditLogs.entityType, "client_contact"),
          sql`${auditLogs.metadataJson}->>'clientId' = ${query.entityId}`,
        ),
      );
    }

    return clauses;
  }

  private async getAuditRows(
    context: ApiWorkspaceContext,
    query: ActivityTimelineQuery,
    scope: TimelineScope,
  ) {
    const whereClause = or(...this.getAuditWhereClauses(query, scope));

    if (!whereClause) {
      return [];
    }

    return db
      .select({
        action: auditLogs.action,
        actorEmail: auditActors.email,
        actorName: auditActors.name,
        actorUserId: auditLogs.actorUserId,
        createdAt: auditLogs.createdAt,
        entityId: auditLogs.entityId,
        entityType: auditLogs.entityType,
        id: auditLogs.id,
        metadataJson: auditLogs.metadataJson,
      })
      .from(auditLogs)
      .leftJoin(auditActors, eq(auditLogs.actorUserId, auditActors.id))
      .where(and(eq(auditLogs.workspaceId, context.workspace.id), whereClause))
      .orderBy(desc(auditLogs.createdAt), asc(auditLogs.id))
      .limit(Math.max(query.pageSize * 4, 80));
  }

  private async getNoteRows(
    context: ApiWorkspaceContext,
    query: ActivityTimelineQuery,
    scope: TimelineScope,
  ) {
    const submissionIds = scope.submissionRows.map(
      (submission) => submission.id,
    );
    const clauses: SQL[] = [];

    pushClause(
      clauses,
      and(
        eq(notes.entityType, query.entityType),
        eq(notes.entityId, query.entityId),
      ),
    );

    if (scope.jobIds.length > 0) {
      pushClause(
        clauses,
        and(eq(notes.entityType, "job"), inArray(notes.entityId, scope.jobIds)),
      );
    }

    if (submissionIds.length > 0) {
      pushClause(
        clauses,
        and(
          eq(notes.entityType, "submission"),
          inArray(notes.entityId, submissionIds),
        ),
      );
    }

    if (query.entityType === "candidate") {
      pushClause(
        clauses,
        and(
          eq(notes.entityType, "candidate"),
          eq(notes.entityId, query.entityId),
        ),
      );
    }

    const whereClause = or(...clauses);

    if (!whereClause) {
      return [];
    }

    return db
      .select({
        actorEmail: noteActors.email,
        actorName: noteActors.name,
        actorUserId: notes.createdByUserId,
        archivedAt: notes.archivedAt,
        archivedByEmail: noteArchiveActors.email,
        archivedByName: noteArchiveActors.name,
        archivedByUserId: notes.archivedByUserId,
        body: notes.body,
        createdAt: notes.createdAt,
        entityId: notes.entityId,
        entityType: notes.entityType,
        id: notes.id,
      })
      .from(notes)
      .leftJoin(noteActors, eq(notes.createdByUserId, noteActors.id))
      .leftJoin(
        noteArchiveActors,
        eq(notes.archivedByUserId, noteArchiveActors.id),
      )
      .where(
        and(
          eq(notes.workspaceId, context.workspace.id),
          isNull(notes.finalDeletedAt),
          whereClause,
        ),
      )
      .orderBy(
        desc(sql`coalesce(${notes.archivedAt}, ${notes.createdAt})`),
        asc(notes.id),
      )
      .limit(Math.max(query.pageSize * 2, 40));
  }

  private getEntityReference(
    row: AuditTimelineRow,
    scope: TimelineScope,
  ): ActivityTimelineEntityReference | null {
    const metadata = isRecord(row.metadataJson) ? row.metadataJson : {};
    const taskMap = new Map(scope.taskRows.map((task) => [task.id, task]));
    const documentMap = new Map(
      scope.documentRows.map((document) => [document.id, document]),
    );
    const submissionMap = new Map(
      scope.submissionRows.map((submission) => [submission.id, submission]),
    );

    if (!row.entityId || !row.entityType) {
      return null;
    }

    if (row.entityType === "task") {
      const task = taskMap.get(row.entityId);

      return createReference({
        href: buildTaskListHref(task),
        id: row.entityId,
        label: task?.title ?? "Unknown task",
        secondaryLabel: task ? humanizeToken(task.status) : null,
        type: "task",
      });
    }

    if (row.entityType === "document") {
      const document = documentMap.get(row.entityId);

      return createReference({
        href: buildDocumentListHref(document),
        id: row.entityId,
        label:
          document?.title ??
          getString(metadata, "title") ??
          getString(metadata, "sourceFilename") ??
          "Unknown document",
        secondaryLabel: document ? humanizeToken(document.type) : null,
        type: "document",
      });
    }

    if (row.entityType === "submission") {
      const submission = submissionMap.get(row.entityId);

      return createReference({
        href: buildSubmissionHref(submission),
        id: row.entityId,
        label: submission?.candidateName ?? "Unknown submission",
        secondaryLabel: submission
          ? compact([submission.clientName, submission.jobTitle]).join(" / ")
          : null,
        type: "submission",
      });
    }

    if (row.entityType === "client_contact") {
      return createReference({
        href: scope.target.type === "client" ? scope.target.href : null,
        id: row.entityId,
        label: getString(metadata, "contactName") ?? "Client contact",
        secondaryLabel: "Contact",
        type: "client_contact",
      });
    }

    if (
      row.entityId === scope.target.id &&
      row.entityType === scope.target.type
    ) {
      return scope.target;
    }

    return createReference({
      href: null,
      id: row.entityId,
      label: humanizeToken(row.entityType),
      secondaryLabel: null,
      type: row.entityType,
    });
  }

  private serializeAuditEvent(
    row: AuditTimelineRow,
    scope: TimelineScope,
  ): ActivityTimelineEvent {
    const actor = getActorReference(row);
    const entity = this.getEntityReference(row, scope);
    const type = getEventType(row.action);

    return {
      action: row.action,
      actor,
      actorLabel: actor?.name ?? actor?.email ?? "System",
      description: getAuditDescription(row, entity),
      entity,
      id: `audit-${row.id}`,
      metadata: getAuditMetadata(row),
      occurredAt: row.createdAt.toISOString(),
      relatedEntity: entity?.id === scope.target.id ? null : scope.target,
      source: "audit",
      title: getActionTitle(row.action),
      tone: eventTypeToneMap[type],
      type,
    };
  }

  private getNoteEntityReference(
    row: NoteTimelineRow,
    scope: TimelineScope,
  ): ActivityTimelineEntityReference | null {
    if (
      row.entityId === scope.target.id &&
      row.entityType === scope.target.type
    ) {
      return scope.target;
    }

    const submission = scope.submissionRows.find(
      (item) => item.id === row.entityId && row.entityType === "submission",
    );

    if (submission) {
      return createReference({
        href: buildSubmissionHref(submission),
        id: submission.id,
        label: submission.candidateName,
        secondaryLabel: compact([
          submission.clientName,
          submission.jobTitle,
        ]).join(" / "),
        type: "submission",
      });
    }

    return row.entityId
      ? createReference({
          href: null,
          id: row.entityId,
          label: humanizeToken(row.entityType),
          secondaryLabel: null,
          type: row.entityType,
        })
      : null;
  }

  private serializeNoteEvent(
    row: NoteTimelineRow,
    scope: TimelineScope,
  ): ActivityTimelineEvent {
    const actor = getActorReference(row);
    const entity = this.getNoteEntityReference(row, scope);

    if (row.archivedAt) {
      const archiveActor = getActorReference({
        actorEmail: row.archivedByEmail,
        actorName: row.archivedByName,
        actorUserId: row.archivedByUserId,
      });
      const originalAuthorLabel = actor?.name ?? actor?.email ?? null;
      const deletedContent = row.body.trim();
      const metadata = compact([originalAuthorLabel]).map((value) => ({
        label: "Original author",
        value,
      }));

      if (deletedContent) {
        metadata.push({
          label: "Deleted content",
          value: deletedContent,
        });
      }

      return {
        action: "NOTE_ARCHIVED",
        actor: archiveActor,
        actorLabel: archiveActor?.name ?? archiveActor?.email ?? "System",
        description: deletedContent
          ? toDeletedNotePreview(deletedContent)
          : "A workspace note was deleted. Its content is hidden.",
        entity,
        id: `note-archived-${row.id}`,
        metadata,
        occurredAt: row.archivedAt.toISOString(),
        relatedEntity: entity?.id === scope.target.id ? null : scope.target,
        source: "note",
        title: "Note deleted",
        tone: eventTypeToneMap.note,
        type: "note",
      };
    }

    const trimmedBody = row.body.trim();
    const description =
      trimmedBody.length > 140
        ? `${trimmedBody.slice(0, 137)}...`
        : trimmedBody;

    return {
      action: "NOTE_ADDED",
      actor,
      actorLabel: actor?.name ?? actor?.email ?? "System",
      description,
      entity,
      id: `note-${row.id}`,
      metadata: entity ? [{ label: "Linked to", value: entity.label }] : [],
      occurredAt: row.createdAt.toISOString(),
      relatedEntity: entity?.id === scope.target.id ? null : scope.target,
      source: "note",
      title: "Note added",
      tone: eventTypeToneMap.note,
      type: "note",
    };
  }

  async getTimeline(
    context: ApiWorkspaceContext,
    query: ActivityTimelineQuery,
  ): Promise<ActivityTimelineResponse> {
    const scope = await this.getScope(context, query);
    const [auditRows, noteRows] = await Promise.all([
      this.getAuditRows(context, query, scope),
      this.getNoteRows(context, query, scope),
    ]);
    const items = [
      ...auditRows.map((row) => this.serializeAuditEvent(row, scope)),
      ...noteRows.map((row) => this.serializeNoteEvent(row, scope)),
    ]
      .sort(
        (left, right) =>
          new Date(right.occurredAt).getTime() -
          new Date(left.occurredAt).getTime(),
      )
      .slice(0, query.pageSize);
    const countsByType = emptyCounts();

    for (const item of items) {
      countsByType[item.type] += 1;
    }

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
      items,
      summary: {
        countsByType,
        totalCount: items.length,
      },
      target: scope.target,
      workspaceScoped: true,
    };
  }
}
