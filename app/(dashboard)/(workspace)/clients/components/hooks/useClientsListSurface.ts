"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import type { ClientsListResponse } from "@recruitflow/contracts";

import {
  areClientListFiltersEqual,
  normalizeClientListFilters,
  parseClientListFiltersFromSearchParams,
  type ClientListFilters,
  clientListFiltersToSearchParams,
} from "@/lib/clients/filters";
import { clientsListQueryOptions } from "@/lib/query/options";
import { useUrlBackedListFilters } from "@/hooks/useUrlBackedListFilters";

import {
  useClientRestoreMutation,
  useClientsListMutationState,
} from "./useClientMutations";

type UseClientsListSurfaceOptions = {
  initialData: ClientsListResponse;
  initialFilters: ClientListFilters;
};

const getFilterCount = (filters: ClientListFilters) =>
  [
    filters.q,
    filters.status,
    filters.owner,
    filters.priority,
    filters.sort !== "name_asc" ? filters.sort : "",
  ].filter(Boolean).length;

const canUsePreviousClientListData = (
  previousFilters: unknown,
  nextFilters: ClientListFilters,
) => {
  const parsedPreviousFilters =
    previousFilters && typeof previousFilters === "object"
      ? normalizeClientListFilters(
          previousFilters as Partial<
            Record<keyof ClientListFilters, string | null | undefined>
          >,
        )
      : null;

  if (!parsedPreviousFilters) {
    return false;
  }

  return (
    parsedPreviousFilters.owner === nextFilters.owner &&
    parsedPreviousFilters.priority === nextFilters.priority &&
    parsedPreviousFilters.q === nextFilters.q &&
    parsedPreviousFilters.sort === nextFilters.sort &&
    parsedPreviousFilters.status === nextFilters.status
  );
};

const useClientsListSurface = ({
  initialData,
  initialFilters,
}: UseClientsListSurfaceOptions) => {
  const { hasClientListMutation, refreshClientsListCache } =
    useClientsListMutationState();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<
    ClientsListResponse["items"][number] | null
  >(null);
  const {
    applyFilters,
    filters,
    normalizedInitialFilters,
    searchDraft,
    setSearchDraft,
  } = useUrlBackedListFilters({
    areFiltersEqual: areClientListFiltersEqual,
    filtersToSearchParams: clientListFiltersToSearchParams,
    initialFilters,
    normalizeFilters: normalizeClientListFilters,
    parseFiltersFromSearchParams: parseClientListFiltersFromSearchParams,
    searchKey: "q",
    searchResetUpdates: { page: "" },
  });

  const isInitialQuery =
    areClientListFiltersEqual(filters, normalizedInitialFilters) &&
    !hasClientListMutation;
  const {
    data: clientsList = initialData,
    error,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    ...clientsListQueryOptions(filters),
    initialData: isInitialQuery ? initialData : undefined,
    placeholderData: (previousData, previousQuery) =>
      canUsePreviousClientListData(previousQuery?.queryKey[2], filters)
        ? previousData
        : undefined,
  });
  const restoreClientMutation = useClientRestoreMutation({
    onSuccess: async () => {
      await refreshClientsListCache();
    },
  });

  const filterCount = getFilterCount(filters);
  const hasFilters = filterCount > 0;
  const ownerFilterOptions = [
    { label: "All owners", value: "" },
    ...clientsList.ownerOptions.map((owner) => ({
      label: owner.name ?? owner.email,
      value: owner.id,
    })),
  ];
  const openJobsCount = clientsList.items.reduce(
    (total, client) => total + client.openJobsCount,
    0,
  );
  const currentPage = clientsList.pagination.page;
  const totalPages = clientsList.pagination.totalPages;
  const canRestoreClientControls = clientsList.context.role !== "coordinator";

  const resetFilters = React.useCallback(() => {
    setSearchDraft("");
    applyFilters({
      owner: "",
      page: "",
      priority: "",
      q: "",
      sort: "name_asc",
      status: "",
    });
  }, [applyFilters]);

  const handleClientCreated = React.useCallback(() => {
    void refreshClientsListCache();
  }, [refreshClientsListCache]);

  const handleClientUpdated = React.useCallback(() => {
    void refreshClientsListCache();
  }, [refreshClientsListCache]);

  return {
    applyFilters,
    canRestoreClientControls,
    clientsList,
    currentPage,
    editingClient,
    error,
    filterCount,
    filters,
    handleClientCreated,
    handleClientUpdated,
    hasFilters,
    isCreateDialogOpen,
    isError,
    isFetching,
    openJobsCount,
    ownerFilterOptions,
    refetch,
    resetFilters,
    restoreClientMutation,
    searchDraft,
    setEditingClient,
    setIsCreateDialogOpen,
    setSearchDraft,
    totalPages,
  };
};

export { useClientsListSurface };
