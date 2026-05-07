"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import * as React from "react";

import { useUrlBackedListFilters } from "@/hooks/useUrlBackedListFilters";
import {
  areDocumentListFiltersEqual,
  type DocumentListFilters,
  documentListFiltersToSearchParams,
  normalizeDocumentListFilters,
  parseDocumentListFiltersFromSearchParams,
} from "@/lib/documents/filters";
import { documentsListQueryOptions } from "@/lib/query/options";

type UseDocumentsListSurfaceOptions = {
  initialFilters: DocumentListFilters;
};

const getDocumentFilterCount = (filters: DocumentListFilters) =>
  [filters.type, filters.entityType, filters.entityId, filters.q].filter(
    Boolean,
  ).length;

const useDocumentsListSurface = ({
  initialFilters,
}: UseDocumentsListSurfaceOptions) => {
  const { applyFilters, filters, normalizedInitialFilters } =
    useUrlBackedListFilters({
      areFiltersEqual: areDocumentListFiltersEqual,
      filtersToSearchParams: documentListFiltersToSearchParams,
      initialFilters,
      normalizeFilters: normalizeDocumentListFilters,
      parseFiltersFromSearchParams: parseDocumentListFiltersFromSearchParams,
    });
  const [entityIdDraft, setEntityIdDraft] = React.useState(
    normalizedInitialFilters.entityId,
  );
  const [searchDraft, setSearchDraft] = React.useState(
    normalizedInitialFilters.q,
  );

  React.useEffect(() => {
    setEntityIdDraft(filters.entityId);
  }, [filters.entityId]);

  React.useEffect(() => {
    setSearchDraft(filters.q);
  }, [filters.q]);

  const {
    data: documentsList,
    error,
    isError,
    isFetching,
    isPending,
    refetch,
  } = useQuery({
    ...documentsListQueryOptions(filters),
    placeholderData: keepPreviousData,
  });
  const filterCount = getDocumentFilterCount(filters);
  const hasFilters = filterCount > 0;
  const currentPage = documentsList?.pagination.page ?? 1;
  const totalPages = documentsList?.pagination.totalPages ?? 1;

  const resetFilters = React.useCallback(() => {
    setEntityIdDraft("");
    applyFilters({
      entityId: "",
      entityType: "",
      page: "",
      q: "",
      type: "",
    });
  }, [applyFilters]);

  return {
    applyFilters,
    currentPage,
    documentsList,
    entityIdDraft,
    error,
    filterCount,
    filters,
    hasFilters,
    isError,
    isFetching,
    isPending,
    refetch,
    resetFilters,
    searchDraft,
    setEntityIdDraft,
    setSearchDraft,
    totalPages,
  };
};

export { useDocumentsListSurface };
