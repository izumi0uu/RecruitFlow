import { queryOptions } from "@tanstack/react-query";

import { fetchJson } from "@/lib/query/fetcher";
import type { CurrentTeamDto, CurrentUserDto } from "@/lib/query/types";

export const userQueryKey = ["user"] as const;
export const teamQueryKey = ["team"] as const;

export const currentUserQueryOptions = () =>
  queryOptions({
    queryKey: userQueryKey,
    queryFn: () => fetchJson<CurrentUserDto>("/api/user"),
  });

export const currentTeamQueryOptions = () =>
  queryOptions({
    queryKey: teamQueryKey,
    queryFn: () => fetchJson<CurrentTeamDto>("/api/team"),
  });
