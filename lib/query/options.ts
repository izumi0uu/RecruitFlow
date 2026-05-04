import type {
  ActivityTimelineQuery,
  ActivityTimelineResponse,
  CandidatesListResponse,
  ClientDetailResponse,
  ClientsListResponse,
  DocumentsListResponse,
  JobDetailResponse,
  JobsListResponse,
  NotesListQuery,
  NotesListResponse,
  SubmissionsListResponse,
  TasksListResponse,
} from "@recruitflow/contracts";
import { queryOptions } from "@tanstack/react-query";

import {
  type CandidateListFilters,
  candidateListFiltersToSearchParams,
} from "@/lib/candidates/filters";
import {
  type ClientListFilters,
  clientListFiltersToSearchParams,
} from "@/lib/clients/filters";
import {
  type DocumentListFilters,
  documentListFiltersToSearchParams,
} from "@/lib/documents/filters";
import {
  type JobListFilters,
  jobListFiltersToSearchParams,
} from "@/lib/jobs/filters";
import { fetchJson } from "@/lib/query/fetcher";
import type { CurrentUserDto, CurrentWorkspaceDto } from "@/lib/query/types";
import {
  type TaskListFilters,
  taskListFiltersToSearchParams,
} from "@/lib/tasks/filters";

export const userQueryKey = ["user"] as const;
export const workspaceQueryKey = ["workspace"] as const;
export const teamQueryKey = workspaceQueryKey;

export const currentUserQueryOptions = () =>
  queryOptions({
    queryKey: userQueryKey,
    queryFn: () => fetchJson<CurrentUserDto>("/api/user"),
  });

export const currentWorkspaceQueryOptions = () =>
  queryOptions({
    queryKey: workspaceQueryKey,
    queryFn: () => fetchJson<CurrentWorkspaceDto>("/api/workspace"),
  });

export const currentTeamQueryOptions = currentWorkspaceQueryOptions;

export const clientsListRootQueryKey = ["clients", "list"] as const;
export const clientsDetailRootQueryKey = ["clients", "detail"] as const;

export const candidatesListRootQueryKey = ["candidates", "list"] as const;

export const candidatesListQueryKey = (filters: CandidateListFilters) =>
  [...candidatesListRootQueryKey, filters] as const;

export const candidatesListQueryOptions = (filters: CandidateListFilters) =>
  queryOptions({
    queryKey: candidatesListQueryKey(filters),
    queryFn: () => {
      const params = candidateListFiltersToSearchParams(filters, {
        includePageSize: true,
      });
      const queryString = params.toString();

      return fetchJson<CandidatesListResponse>(
        `/api/candidates${queryString ? `?${queryString}` : ""}`,
      );
    },
  });

export const clientsListQueryKey = (filters: ClientListFilters) =>
  [...clientsListRootQueryKey, filters] as const;

export const clientDetailQueryKey = (clientId: string) =>
  [...clientsDetailRootQueryKey, clientId] as const;

export const clientsListQueryOptions = (filters: ClientListFilters) =>
  queryOptions({
    queryKey: clientsListQueryKey(filters),
    queryFn: () => {
      const params = clientListFiltersToSearchParams(filters, {
        includePageSize: true,
      });
      const queryString = params.toString();

      return fetchJson<ClientsListResponse>(
        `/api/clients${queryString ? `?${queryString}` : ""}`,
      );
    },
  });

export const clientDetailQueryOptions = (clientId: string) =>
  queryOptions({
    queryKey: clientDetailQueryKey(clientId),
    queryFn: () => fetchJson<ClientDetailResponse>(`/api/clients/${clientId}`),
  });

export const jobsListRootQueryKey = ["jobs", "list"] as const;
export const jobsDetailRootQueryKey = ["jobs", "detail"] as const;

export const jobsListQueryKey = (filters: JobListFilters) =>
  [...jobsListRootQueryKey, filters] as const;

export const jobDetailQueryKey = (jobId: string) =>
  [...jobsDetailRootQueryKey, jobId] as const;

export const jobsListQueryOptions = (filters: JobListFilters) =>
  queryOptions({
    queryKey: jobsListQueryKey(filters),
    queryFn: () => {
      const params = jobListFiltersToSearchParams(filters, {
        includePageSize: true,
      });
      const queryString = params.toString();

      return fetchJson<JobsListResponse>(
        `/api/jobs${queryString ? `?${queryString}` : ""}`,
      );
    },
  });

export const jobDetailQueryOptions = (jobId: string) =>
  queryOptions({
    queryKey: jobDetailQueryKey(jobId),
    queryFn: () => fetchJson<JobDetailResponse>(`/api/jobs/${jobId}`),
  });

export const documentsListRootQueryKey = ["documents", "list"] as const;

export const documentsListQueryKey = (filters: DocumentListFilters) =>
  [...documentsListRootQueryKey, filters] as const;

export const documentsListQueryOptions = (filters: DocumentListFilters) =>
  queryOptions({
    queryKey: documentsListQueryKey(filters),
    queryFn: () => {
      const params = documentListFiltersToSearchParams(filters, {
        includePageSize: true,
      });
      const queryString = params.toString();

      return fetchJson<DocumentsListResponse>(
        `/api/documents${queryString ? `?${queryString}` : ""}`,
      );
    },
  });

export const submissionsListRootQueryKey = ["submissions", "list"] as const;

export const submissionsListQueryOptions = () =>
  queryOptions({
    queryKey: submissionsListRootQueryKey,
    queryFn: () => fetchJson<SubmissionsListResponse>("/api/submissions"),
  });

export const tasksListRootQueryKey = ["tasks", "list"] as const;

export const tasksListQueryKey = (filters: TaskListFilters) =>
  [...tasksListRootQueryKey, filters] as const;

export const tasksListQueryOptions = (filters: TaskListFilters) =>
  queryOptions({
    queryKey: tasksListQueryKey(filters),
    queryFn: () => {
      const params = taskListFiltersToSearchParams(filters, {
        includePageSize: true,
      });
      const queryString = params.toString();

      return fetchJson<TasksListResponse>(
        `/api/tasks${queryString ? `?${queryString}` : ""}`,
      );
    },
  });

export const activityTimelineRootQueryKey = ["activity", "timeline"] as const;

export const activityTimelineQueryKey = (query: ActivityTimelineQuery) =>
  [...activityTimelineRootQueryKey, query] as const;

export const activityTimelineQueryOptions = (query: ActivityTimelineQuery) =>
  queryOptions({
    queryKey: activityTimelineQueryKey(query),
    queryFn: () => {
      const params = new URLSearchParams({
        entityId: query.entityId,
        entityType: query.entityType,
        pageSize: String(query.pageSize),
      });

      return fetchJson<ActivityTimelineResponse>(
        `/api/activity/timeline?${params.toString()}`,
      );
    },
  });

export const notesListRootQueryKey = ["notes", "list"] as const;

export const notesListQueryKey = (query: NotesListQuery) =>
  [...notesListRootQueryKey, query] as const;

export const notesListQueryOptions = (query: NotesListQuery) =>
  queryOptions({
    queryKey: notesListQueryKey(query),
    queryFn: () => {
      const params = new URLSearchParams({
        entityId: query.entityId,
        entityType: query.entityType,
        page: String(query.page),
        pageSize: String(query.pageSize),
      });

      return fetchJson<NotesListResponse>(`/api/notes?${params.toString()}`);
    },
  });
