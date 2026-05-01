"use client";

import * as React from "react";

/**
 * Returns a value that only updates after it has stayed unchanged for `delayMs`.
 *
 * Use this when an immediate UI value should not update downstream state on
 * every change, such as search input that eventually feeds a query key.
 */
const useDebouncedValue = <TValue,>(value: TValue, delayMs: number) => {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [delayMs, value]);

  return debouncedValue;
};

export { useDebouncedValue };
