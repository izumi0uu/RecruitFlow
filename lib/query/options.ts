import { queryOptions } from "@tanstack/react-query";

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
