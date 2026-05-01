"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

const useClientContactCreateAction = () => {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const handleContactCreated = React.useCallback(() => {
    router.refresh();
  }, [router]);

  return {
    handleContactCreated,
    open,
    setOpen,
  };
};

export { useClientContactCreateAction };
