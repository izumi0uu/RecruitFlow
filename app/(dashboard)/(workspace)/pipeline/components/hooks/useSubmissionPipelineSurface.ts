"use client";

import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { SubmissionsListResponse } from "@recruitflow/contracts";

import { useUrlBackedListFilters } from "@/hooks/useUrlBackedListFilters";
import { submissionsListQueryOptions } from "@/lib/query/options";
import {
  areSubmissionPipelineFiltersEqual,
  normalizeSubmissionPipelineFilters,
  parseSubmissionPipelineFiltersFromSearchParams,
  submissionPipelineFiltersToSearchParams,
  type SubmissionPipelineFilters,
} from "@/lib/submissions/filters";

type UseSubmissionPipelineSurfaceOptions = {
  initialData: SubmissionsListResponse;
  initialFilters: SubmissionPipelineFilters;
};

const getSubmissionPipelineFilterCount = (
  filters: SubmissionPipelineFilters,
) =>
  [
    filters.candidateId,
    filters.clientId,
    filters.jobId,
    filters.owner,
    filters.q,
    filters.risk,
    filters.stage,
  ].filter(Boolean).length;

const useSubmissionPipelineSurface = ({
  initialData,
  initialFilters,
}: UseSubmissionPipelineSurfaceOptions) => {
  const {
    applyFilters,
    filters,
    normalizedInitialFilters,
    searchDraft,
    setSearchDraft,
  } = useUrlBackedListFilters({
    areFiltersEqual: areSubmissionPipelineFiltersEqual,
    filtersToSearchParams: submissionPipelineFiltersToSearchParams,
    initialFilters,
    normalizeFilters: normalizeSubmissionPipelineFilters,
    parseFiltersFromSearchParams: parseSubmissionPipelineFiltersFromSearchParams,
    searchKey: "q",
  });
  const isInitialQuery = areSubmissionPipelineFiltersEqual(
    filters,
    normalizedInitialFilters,
  );
  const {
    data: submissionsList = initialData,
    error,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    ...submissionsListQueryOptions(filters),
    initialData: isInitialQuery ? initialData : undefined,
    placeholderData: keepPreviousData,
  });
  const filterCount = getSubmissionPipelineFilterCount(filters);
  const hasFilters = filterCount > 0;
  const canLaunchOpportunity = submissionsList.context.role !== "coordinator";

  const resetFilters = React.useCallback(() => {
    setSearchDraft("");
    applyFilters({
      candidateId: "",
      clientId: "",
      jobId: "",
      owner: "",
      q: "",
      risk: "",
      stage: "",
      submissionId: "",
    });
  }, [applyFilters, setSearchDraft]);

  return {
    applyFilters,
    canLaunchOpportunity,
    currentView: filters.view,
    error,
    filterCount,
    filters,
    hasFilters,
    isError,
    isFetching,
    refetch,
    resetFilters,
    searchDraft,
    setSearchDraft,
    submissionCreated: filters.submissionCreated === "1",
    submissionsList,
  };
};

export { useSubmissionPipelineSurface };
