import { queryOptions } from "@tanstack/react-query";

import type { ClientsListResponse } from "@recruitflow/contracts";

import {
  clientListFiltersToSearchParams,
  type ClientListFilters,
} from "@/lib/clients/filters";
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

export const clientsListQueryKey = (filters: ClientListFilters) =>
  ["clients", "list", filters] as const;

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
