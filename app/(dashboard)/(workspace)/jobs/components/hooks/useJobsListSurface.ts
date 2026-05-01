"use client";

import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { JobsListResponse } from "@recruitflow/contracts";

import {
  areJobListFiltersEqual,
  jobListFiltersToSearchParams,
  normalizeJobListFilters,
  parseJobListFiltersFromSearchParams,
  type JobListFilters,
} from "@/lib/jobs/filters";
import { jobsListQueryOptions } from "@/lib/query/options";
import { useUrlBackedListFilters } from "@/hooks/useUrlBackedListFilters";

import { getJobFilterCount } from "../../utils";

type UseJobsListSurfaceOptions = {
  initialData: JobsListResponse;
  initialFilters: JobListFilters;
};

const activeJobStatuses = new Set(["intake", "open", "on_hold"]);

const useJobsListSurface = ({
  initialData,
  initialFilters,
}: UseJobsListSurfaceOptions) => {
  const {
    applyFilters,
    filters,
    normalizedInitialFilters,
    searchDraft,
    setSearchDraft,
  } = useUrlBackedListFilters({
    areFiltersEqual: areJobListFiltersEqual,
    filtersToSearchParams: jobListFiltersToSearchParams,
    initialFilters,
    normalizeFilters: normalizeJobListFilters,
    parseFiltersFromSearchParams: parseJobListFiltersFromSearchParams,
    searchKey: "q",
    searchResetUpdates: { page: "" },
  });

  const isInitialQuery = areJobListFiltersEqual(
    filters,
    normalizedInitialFilters,
  );
  const {
    data: jobsList = initialData,
    error,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    ...jobsListQueryOptions(filters),
    initialData: isInitialQuery ? initialData : undefined,
    placeholderData: keepPreviousData,
  });

  const filterCount = getJobFilterCount(filters);
  const hasFilters = filterCount > 0;
  const currentPage = jobsList.pagination.page;
  const totalPages = jobsList.pagination.totalPages;
  const activeJobsCount = jobsList.items.filter((job) =>
    activeJobStatuses.has(job.status),
  ).length;
  const urgentJobsCount = jobsList.items.filter(
    (job) => job.priority === "urgent",
  ).length;
  const canManageJobs = jobsList.context.role !== "coordinator";
  const clientOptions = [
    { label: "All clients", value: "" },
    ...jobsList.clientOptions.map((client) => ({
      label: client.name,
      value: client.id,
    })),
  ];
  const ownerOptions = [
    { label: "All owners", value: "" },
    ...jobsList.ownerOptions.map((owner) => ({
      label: owner.name ?? owner.email,
      value: owner.id,
    })),
  ];

  const resetFilters = React.useCallback(() => {
    setSearchDraft("");
    applyFilters({
      clientId: "",
      owner: "",
      page: "",
      priority: "",
      q: "",
      sort: "opened_desc",
      status: "",
    });
  }, [applyFilters]);

  return {
    activeJobsCount,
    applyFilters,
    canManageJobs,
    clientOptions,
    currentPage,
    error,
    filterCount,
    filters,
    hasFilters,
    isError,
    isFetching,
    jobsList,
    ownerOptions,
    refetch,
    resetFilters,
    searchDraft,
    setSearchDraft,
    totalPages,
    urgentJobsCount,
  };
};

export { useJobsListSurface };
