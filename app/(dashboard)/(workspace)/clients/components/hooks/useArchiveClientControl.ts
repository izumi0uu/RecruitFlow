"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useClientArchiveMutation } from "./useClientMutations";

const useArchiveClientControl = () => {
  const router = useRouter();
  const { archiveClient, error, isPending } = useClientArchiveMutation({
    onSuccess: () => {
      router.push("/clients");
    },
  });

  const handleArchiveClient = React.useCallback(
    (clientId: string) => {
      archiveClient(clientId);
    },
    [archiveClient],
  );

  return {
    error,
    handleArchiveClient,
    isPending,
  };
};

export { useArchiveClientControl };
