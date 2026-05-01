"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import {
  useClientRestoreMutation,
  useClientsListMutationState,
} from "./useClientMutations";

const useRestoreClientControl = () => {
  const router = useRouter();
  const { clearClientsListCache } = useClientsListMutationState();
  const { error, isPending, restoreClient } = useClientRestoreMutation({
    onSuccess: () => {
      clearClientsListCache();
      router.refresh();
    },
  });

  const handleRestoreClient = React.useCallback(
    (clientId: string) => {
      restoreClient(clientId);
    },
    [restoreClient],
  );

  return {
    error,
    handleRestoreClient,
    isPending,
  };
};

export { useRestoreClientControl };
