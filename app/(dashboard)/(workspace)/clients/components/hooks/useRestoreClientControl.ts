"use client";

import * as React from "react";

import { useClientRestoreMutation } from "./useClientMutations";

const useRestoreClientControl = () => {
  const { error, isPending, restoreClient } = useClientRestoreMutation();

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
