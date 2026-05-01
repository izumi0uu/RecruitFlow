"use client";

import * as React from "react";

import { useDebouncedValue } from "@/hooks/useDebouncedValue";

type UrlBackedListFiltersOptions<TFilters extends Record<string, string>> = {
  areFiltersEqual: (first: TFilters, second: TFilters) => boolean;
  debounceMs?: number;
  filtersToSearchParams: (filters: TFilters) => URLSearchParams;
  initialFilters: TFilters;
  normalizeFilters: (filters: Partial<TFilters>) => TFilters;
  parseFiltersFromSearchParams: (params: URLSearchParams) => TFilters;
  // Optional text field that stays editable before it is committed to
  // URL-backed filters.
  searchKey?: keyof TFilters;
  // Extra updates to apply when the debounced search value is committed, such
  // as resetting pagination.
  searchResetUpdates?: Partial<TFilters>;
};

const buildUrlFromSearchParams = (params: URLSearchParams) => {
  const queryString = params.toString();

  return `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
};

/**
 * Manages reusable list filters whose committed state is mirrored into the URL.
 *
 * The hook separates editable search input from committed filters:
 * `searchDraft` may change on every keystroke, while `filters` only changes
 * after debounce or explicit filter actions. Callers can safely use `filters`
 * in TanStack Query keys because intermediate search keystrokes never become
 * query keys or URL states.
 */
const useUrlBackedListFilters = <TFilters extends Record<string, string>>({
  areFiltersEqual,
  debounceMs = 320,
  filtersToSearchParams,
  initialFilters,
  normalizeFilters,
  parseFiltersFromSearchParams,
  searchKey,
  searchResetUpdates = {},
}: UrlBackedListFiltersOptions<TFilters>) => {
  const normalizedInitialFilters = React.useMemo(
    () => normalizeFilters(initialFilters),
    [initialFilters, normalizeFilters],
  );
  const [filters, setFilters] = React.useState(normalizedInitialFilters);
  // `filters` is the committed state used by callers for query keys and URL sync.
  // `searchDraft` is only the input value, so fast typing does not create
  // intermediate query keys.
  const [searchDraft, setSearchDraft] = React.useState(
    searchKey ? normalizedInitialFilters[searchKey] : "",
  );
  const normalizedSearchDraft = searchDraft.trim();
  const debouncedSearchDraft = useDebouncedValue(
    normalizedSearchDraft,
    debounceMs,
  );
  // Keep the latest committed filters available to stable callbacks without making
  // every filter change recreate `applyFilters`.
  const filtersRef = React.useRef(filters);
  const searchResetUpdatesRef = React.useRef(searchResetUpdates);

  React.useEffect(() => {
    searchResetUpdatesRef.current = searchResetUpdates;
  }, [searchResetUpdates]);

  React.useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  React.useEffect(() => {
    if (!searchKey) {
      return;
    }

    setSearchDraft(filters[searchKey]);
  }, [filters, searchKey]);

  const writeUrl = React.useCallback(
    (nextFilters: TFilters) => {
      const nextUrl = buildUrlFromSearchParams(
        filtersToSearchParams(nextFilters),
      );
      const currentUrl = `${window.location.pathname}${window.location.search}`;

      if (nextUrl !== currentUrl) {
        window.history.replaceState(null, "", nextUrl);
      }
    },
    [filtersToSearchParams],
  );

  const applyFilters = React.useCallback(
    (updates: Partial<TFilters>) => {
      // This is the single commit point for list filters: normalize, update React
      // state, and mirror the same committed value into the address bar.
      const nextFilters = normalizeFilters({
        ...filtersRef.current,
        ...updates,
      });

      if (areFiltersEqual(filtersRef.current, nextFilters)) {
        return;
      }

      filtersRef.current = nextFilters;
      setFilters(nextFilters);
      writeUrl(nextFilters);
    },
    [areFiltersEqual, normalizeFilters, writeUrl],
  );

  React.useEffect(() => {
    const handlePopState = () => {
      // Browser back/forward owns the URL, so pull the committed filters from it.
      const nextFilters = parseFiltersFromSearchParams(
        new URLSearchParams(window.location.search),
      );

      filtersRef.current = nextFilters;
      setFilters(nextFilters);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [parseFiltersFromSearchParams]);

  React.useEffect(() => {
    if (!searchKey) {
      return;
    }

    // Ignore stale debounced values after immediate actions such as reset or
    // browser navigation have already changed the draft.
    if (debouncedSearchDraft !== normalizedSearchDraft) {
      return;
    }

    if (debouncedSearchDraft === filters[searchKey]) {
      return;
    }

    // Commit the debounced draft value, not the query function. Callers put
    // `filters` in TanStack Query keys, so intermediate keystrokes never become
    // cache entries or URL states.
    applyFilters({
      ...searchResetUpdatesRef.current,
      [searchKey]: debouncedSearchDraft,
    } as Partial<TFilters>);
  }, [
    applyFilters,
    debouncedSearchDraft,
    filters,
    normalizedSearchDraft,
    searchKey,
  ]);

  // Returned surface:
  // - `filters`: committed URL-backed filters for query keys and UI controls.
  // - `applyFilters`: explicit commit API for selects, pagination, and resets.
  // - `searchDraft` / `setSearchDraft`: immediate input state for debounced search.
  // - `normalizedInitialFilters`: stable baseline for deciding whether SSR
  //   initial data still matches the current committed filters.
  return {
    applyFilters,
    filters,
    normalizedInitialFilters,
    searchDraft,
    setSearchDraft,
  };
};

export { useUrlBackedListFilters };
