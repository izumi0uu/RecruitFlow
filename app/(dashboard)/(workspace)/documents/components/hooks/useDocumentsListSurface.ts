"use client";

import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useUrlBackedListFilters } from "@/hooks/useUrlBackedListFilters";
import {
  areDocumentListFiltersEqual,
  documentListFiltersToSearchParams,
  normalizeDocumentListFilters,
  parseDocumentListFiltersFromSearchParams,
  type DocumentListFilters,
} from "@/lib/documents/filters";
import { documentsListQueryOptions } from "@/lib/query/options";

type UseDocumentsListSurfaceOptions = {
  initialFilters: DocumentListFilters;
};

const getDocumentFilterCount = (filters: DocumentListFilters) =>
  [filters.type, filters.entityType, filters.entityId].filter(Boolean).length;

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

  React.useEffect(() => {
    setEntityIdDraft(filters.entityId);
  }, [filters.entityId]);

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
    setEntityIdDraft,
    totalPages,
  };
};

export { useDocumentsListSurface };
