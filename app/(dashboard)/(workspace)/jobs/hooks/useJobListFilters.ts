"use client";

import * as React from "react";

import {
  areJobListFiltersEqual,
  jobListFiltersToSearchParams,
  normalizeJobListFilters,
  parseJobListFiltersFromSearchParams,
  type JobListFilters,
} from "@/lib/jobs/filters";

const buildUrlFromFilters = (filters: JobListFilters) => {
  const queryString = jobListFiltersToSearchParams(filters).toString();

  return `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
};

export const useJobListFilters = (initialFilters: JobListFilters) => {
  const normalizedInitialFilters = React.useMemo(
    () => normalizeJobListFilters(initialFilters),
    [initialFilters],
  );
  const [filters, setFilters] = React.useState(normalizedInitialFilters);
  const [searchDraft, setSearchDraft] = React.useState(
    normalizedInitialFilters.q,
  );
  const filtersRef = React.useRef(filters);

  React.useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  React.useEffect(() => {
    setSearchDraft(filters.q);
  }, [filters.q]);

  const writeUrl = React.useCallback((nextFilters: JobListFilters) => {
    const nextUrl = buildUrlFromFilters(nextFilters);
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, []);

  const applyFilters = React.useCallback(
    (updates: Partial<JobListFilters>) => {
      const nextFilters = normalizeJobListFilters({
        ...filtersRef.current,
        ...updates,
      });

      if (areJobListFiltersEqual(filtersRef.current, nextFilters)) {
        return;
      }

      filtersRef.current = nextFilters;
      setFilters(nextFilters);
      writeUrl(nextFilters);
    },
    [writeUrl],
  );

  React.useEffect(() => {
    const handlePopState = () => {
      const nextFilters = parseJobListFiltersFromSearchParams(
        new URLSearchParams(window.location.search),
      );

      filtersRef.current = nextFilters;
      setFilters(nextFilters);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  React.useEffect(() => {
    const nextSearchValue = searchDraft.trim();

    if (nextSearchValue === filters.q) {
      return;
    }

    const timeout = window.setTimeout(() => {
      applyFilters({ page: "", q: nextSearchValue });
    }, 320);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [applyFilters, filters.q, searchDraft]);

  const resetFilters = React.useCallback(() => {
    setSearchDraft("");
    applyFilters({
      clientId: "",
      owner: "",
      page: "",
      priority: "",
      q: "",
      sort: "opened_desc",
      status: "",
    });
  }, [applyFilters]);

  return {
    applyFilters,
    filters,
    normalizedInitialFilters,
    resetFilters,
    searchDraft,
    setSearchDraft,
  };
};
