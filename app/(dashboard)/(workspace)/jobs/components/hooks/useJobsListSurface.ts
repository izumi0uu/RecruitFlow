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

import { getJobFilterCount } from "../../utils";

type UseJobsListSurfaceOptions = {
  initialData: JobsListResponse;
  initialFilters: JobListFilters;
};

const activeJobStatuses = new Set(["intake", "open", "on_hold"]);

const buildUrlFromFilters = (filters: JobListFilters) => {
  const queryString = jobListFiltersToSearchParams(filters).toString();

  return `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
};

const useJobsListSurface = ({
  initialData,
  initialFilters,
}: UseJobsListSurfaceOptions) => {
  const normalizedInitialFilters = React.useMemo(
    () => normalizeJobListFilters(initialFilters),
    [initialFilters],
  );
  const [filters, setFilters] = React.useState(normalizedInitialFilters);
  const [searchDraft, setSearchDraft] = React.useState(
    normalizedInitialFilters.q,
  );
  const filtersRef = React.useRef(filters);

  React.useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  React.useEffect(() => {
    setSearchDraft(filters.q);
  }, [filters.q]);

  const writeUrl = React.useCallback((nextFilters: JobListFilters) => {
    const nextUrl = buildUrlFromFilters(nextFilters);
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, []);

  const applyFilters = React.useCallback(
    (updates: Partial<JobListFilters>) => {
      const nextFilters = normalizeJobListFilters({
        ...filtersRef.current,
        ...updates,
      });

      if (areJobListFiltersEqual(filtersRef.current, nextFilters)) {
        return;
      }

      filtersRef.current = nextFilters;
      setFilters(nextFilters);
      writeUrl(nextFilters);
    },
    [writeUrl],
  );

  React.useEffect(() => {
    const handlePopState = () => {
      const nextFilters = parseJobListFiltersFromSearchParams(
        new URLSearchParams(window.location.search),
      );

      filtersRef.current = nextFilters;
      setFilters(nextFilters);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  React.useEffect(() => {
    const nextSearchValue = searchDraft.trim();

    if (nextSearchValue === filters.q) {
      return;
    }

    const timeout = window.setTimeout(() => {
      applyFilters({ page: "", q: nextSearchValue });
    }, 320);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [applyFilters, filters.q, searchDraft]);

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
