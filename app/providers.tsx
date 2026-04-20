"use client";

import {
  HydrationBoundary,
  QueryClientProvider,
  type DehydratedState,
} from "@tanstack/react-query";
import { useState } from "react";

import { createQueryClient } from "@/lib/query/query-client";

type ProvidersProps = {
  children: React.ReactNode;
  dehydratedState?: DehydratedState;
};

export const Providers = ({ children, dehydratedState }: ProvidersProps) => {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>{children}</HydrationBoundary>
    </QueryClientProvider>
  );
};
