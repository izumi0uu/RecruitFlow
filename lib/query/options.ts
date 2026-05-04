import { queryOptions } from "@tanstack/react-query";

import type {
  ClientDetailResponse,
  CandidatesListResponse,
  ClientsListResponse,
  DocumentsListResponse,
  JobDetailResponse,
  JobsListResponse,
  SubmissionsListResponse,
} from "@recruitflow/contracts";

import {
  candidateListFiltersToSearchParams,
  type CandidateListFilters,
} from "@/lib/candidates/filters";
import {
  clientListFiltersToSearchParams,
  type ClientListFilters,
} from "@/lib/clients/filters";
import {
  documentListFiltersToSearchParams,
  type DocumentListFilters,
} from "@/lib/documents/filters";
import {
  jobListFiltersToSearchParams,
  type JobListFilters,
} from "@/lib/jobs/filters";
import {
  EMPTY_SUBMISSION_PIPELINE_FILTERS,
  submissionPipelineFiltersToSearchParams,
  type SubmissionPipelineFilters,
} from "@/lib/submissions/filters";
import { fetchJson } from "@/lib/query/fetcher";
import type { CurrentUserDto, CurrentWorkspaceDto } from "@/lib/query/types";

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

export const submissionsListQueryKey = (
  filters: SubmissionPipelineFilters = EMPTY_SUBMISSION_PIPELINE_FILTERS,
) =>
  [
    ...submissionsListRootQueryKey,
    submissionPipelineFiltersToSearchParams(filters, {
      target: "api",
    }).toString(),
  ] as const;

export const submissionsListQueryOptions = (
  filters: SubmissionPipelineFilters = EMPTY_SUBMISSION_PIPELINE_FILTERS,
) =>
  queryOptions({
    queryKey: submissionsListQueryKey(filters),
    queryFn: () => {
      const params = submissionPipelineFiltersToSearchParams(filters, {
        includePageSize: true,
        target: "api",
      });
      const queryString = params.toString();

      return fetchJson<SubmissionsListResponse>(
        `/api/submissions${queryString ? `?${queryString}` : ""}`,
      );
    },
  });
