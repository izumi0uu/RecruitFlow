"use client";

import * as React from "react";

const useClientContactCreateAction = () => {
  const [open, setOpen] = React.useState(false);

  const handleContactCreated = React.useCallback(() => undefined, []);

  return {
    handleContactCreated,
    open,
    setOpen,
  };
};

export { useClientContactCreateAction };
