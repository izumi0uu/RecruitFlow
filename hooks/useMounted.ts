"use client";

import { useEffect, useState } from "react";

// To fix hydration error
// https://nextjs.org/docs/messages/hydration-error
const useMounted = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
};

export { useMounted };
