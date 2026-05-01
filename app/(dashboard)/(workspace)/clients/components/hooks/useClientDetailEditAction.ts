"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

const useClientDetailEditAction = () => {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const handleClientUpdated = React.useCallback(() => {
    router.refresh();
  }, [router]);

  return {
    handleClientUpdated,
    open,
    setOpen,
  };
};

export { useClientDetailEditAction };
