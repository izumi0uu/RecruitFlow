import { QueryClient } from "@tanstack/react-query";

const STALE_TIME_MS = 60_000;

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
      },
    },
  });
