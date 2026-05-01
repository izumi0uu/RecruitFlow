"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import type { ClientsListResponse } from "@recruitflow/contracts";

import {
  areClientListFiltersEqual,
  clientListFiltersToSearchParams,
  normalizeClientListFilters,
  parseClientListFiltersFromSearchParams,
  type ClientListFilters,
} from "@/lib/clients/filters";
import { clientsListQueryOptions } from "@/lib/query/options";

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

const buildUrlFromFilters = (filters: ClientListFilters) => {
  const queryString = clientListFiltersToSearchParams(filters).toString();

  return `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
};

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
  const normalizedInitialFilters = React.useMemo(
    () => normalizeClientListFilters(initialFilters),
    [initialFilters],
  );
  const [filters, setFilters] = React.useState(normalizedInitialFilters);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<
    ClientsListResponse["items"][number] | null
  >(null);
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

  const writeUrl = React.useCallback((nextFilters: ClientListFilters) => {
    const nextUrl = buildUrlFromFilters(nextFilters);
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, []);

  const applyFilters = React.useCallback(
    (updates: Partial<ClientListFilters>) => {
      const nextFilters = normalizeClientListFilters({
        ...filtersRef.current,
        ...updates,
      });

      if (areClientListFiltersEqual(filtersRef.current, nextFilters)) {
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
      const nextFilters = parseClientListFiltersFromSearchParams(
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
