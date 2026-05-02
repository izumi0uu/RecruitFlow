"use client";

import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useUrlBackedListFilters } from "@/hooks/useUrlBackedListFilters";
import {
  areCandidateListFiltersEqual,
  candidateListFiltersToSearchParams,
  normalizeCandidateListFilters,
  parseCandidateListFiltersFromSearchParams,
  type CandidateListFilters,
} from "@/lib/candidates/filters";
import { candidatesListQueryOptions } from "@/lib/query/options";

type UseCandidatesListSurfaceOptions = {
  initialFilters: CandidateListFilters;
};

const getCandidateFilterCount = (filters: CandidateListFilters) =>
  [
    filters.q,
    filters.owner,
    filters.source,
    filters.location,
    filters.hasResume,
  ].filter(Boolean).length;

const useCandidatesListSurface = ({
  initialFilters,
}: UseCandidatesListSurfaceOptions) => {
  const {
    applyFilters,
    filters,
    normalizedInitialFilters,
    searchDraft,
    setSearchDraft,
  } = useUrlBackedListFilters({
    areFiltersEqual: areCandidateListFiltersEqual,
    filtersToSearchParams: candidateListFiltersToSearchParams,
    initialFilters,
    normalizeFilters: normalizeCandidateListFilters,
    parseFiltersFromSearchParams: parseCandidateListFiltersFromSearchParams,
    searchKey: "q",
    searchResetUpdates: { page: "" },
  });
  const [locationDraft, setLocationDraft] = React.useState(
    normalizedInitialFilters.location,
  );
  const [sourceDraft, setSourceDraft] = React.useState(
    normalizedInitialFilters.source,
  );
  const debouncedLocationDraft = useDebouncedValue(locationDraft.trim(), 320);
  const debouncedSourceDraft = useDebouncedValue(sourceDraft.trim(), 320);

  React.useEffect(() => {
    setLocationDraft(filters.location);
    setSourceDraft(filters.source);
  }, [filters.location, filters.source]);

  React.useEffect(() => {
    if (debouncedSourceDraft === filters.source) {
      return;
    }

    applyFilters({
      page: "",
      source: debouncedSourceDraft,
    });
  }, [applyFilters, debouncedSourceDraft, filters.source]);

  React.useEffect(() => {
    if (debouncedLocationDraft === filters.location) {
      return;
    }

    applyFilters({
      location: debouncedLocationDraft,
      page: "",
    });
  }, [applyFilters, debouncedLocationDraft, filters.location]);

  const {
    data: candidatesList,
    error,
    isError,
    isFetching,
    isPending,
    refetch,
  } = useQuery({
    ...candidatesListQueryOptions(filters),
    placeholderData: keepPreviousData,
  });
  const filterCount = getCandidateFilterCount(filters);
  const hasFilters = filterCount > 0;
  const currentPage = candidatesList?.pagination.page ?? 1;
  const totalPages = candidatesList?.pagination.totalPages ?? 1;

  const resetFilters = React.useCallback(() => {
    setLocationDraft("");
    setSearchDraft("");
    setSourceDraft("");
    applyFilters({
      hasResume: "",
      location: "",
      owner: "",
      page: "",
      q: "",
      source: "",
    });
  }, [applyFilters, setSearchDraft, setLocationDraft, setSourceDraft]);

  return {
    applyFilters,
    candidatesList,
    currentPage,
    error,
    filterCount,
    filters,
    hasFilters,
    isError,
    isFetching,
    isPending,
    locationDraft,
    refetch,
    resetFilters,
    searchDraft,
    setLocationDraft,
    setSearchDraft,
    setSourceDraft,
    sourceDraft,
    totalPages,
  };
};

export { useCandidatesListSurface };
