"use client";

import * as React from "react";

const useClientDetailEditAction = () => {
  const [open, setOpen] = React.useState(false);

  const handleClientUpdated = React.useCallback(() => {
    setOpen(false);
  }, []);

  return {
    handleClientUpdated,
    open,
    setOpen,
  };
};

export { useClientDetailEditAction };
