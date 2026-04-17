"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  ROUTE_LOADING_START_EVENT,
  ROUTE_LOADING_STOP_EVENT,
} from "@/lib/route-loading";
import { cn } from "@/lib/utils";

const MIN_VISIBLE_MS = 260;
const STUCK_RESET_MS = 4000;

const RouteLoadingOverlay = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [isVisible, setIsVisible] = useState(false);
  const hasMountedRef = useRef(false);
  const isVisibleRef = useRef(false);
  const shownAtRef = useRef(0);
  const hideTimerRef = useRef<number | null>(null);
  const stuckTimerRef = useRef<number | null>(null);
  const beginNavigationRef = useRef<() => void>(() => {});
  const endNavigationRef = useRef<() => void>(() => {});

  const clearHideTimer = () => {
    if (hideTimerRef.current === null) {
      return;
    }

    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  };

  const clearStuckTimer = () => {
    if (stuckTimerRef.current === null) {
      return;
    }

    window.clearTimeout(stuckTimerRef.current);
    stuckTimerRef.current = null;
  };

  const clearNavigationTimers = () => {
    clearHideTimer();
    clearStuckTimer();
  };

  const resetNavigation = () => {
    clearNavigationTimers();
    isVisibleRef.current = false;
    setIsVisible(false);
  };

  beginNavigationRef.current = () => {
    clearHideTimer();
    clearStuckTimer();
    shownAtRef.current = Date.now();
    isVisibleRef.current = true;
    setIsVisible(true);

    // If a navigation is cancelled or interrupted, recover automatically.
    stuckTimerRef.current = window.setTimeout(() => {
      resetNavigation();
    }, STUCK_RESET_MS);
  };

  endNavigationRef.current = () => {
    clearStuckTimer();

    if (!isVisibleRef.current || hideTimerRef.current !== null) return;

    const visibleFor = Date.now() - shownAtRef.current;
    const delay = Math.max(MIN_VISIBLE_MS - visibleFor, 0);

    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      isVisibleRef.current = false;
      setIsVisible(false);
    }, delay);
  };

  useEffect(() => {
    const onHistoryNavigation = () => {
      beginNavigationRef.current();
    };
    const onStopNavigation = () => {
      endNavigationRef.current();
    };
    const onPageShow = () => {
      resetNavigation();
    };

    window.addEventListener("popstate", onHistoryNavigation);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener(
      ROUTE_LOADING_START_EVENT,
      onHistoryNavigation as EventListener,
    );
    window.addEventListener(
      ROUTE_LOADING_STOP_EVENT,
      onStopNavigation as EventListener,
    );

    return () => {
      window.removeEventListener("popstate", onHistoryNavigation);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener(
        ROUTE_LOADING_START_EVENT,
        onHistoryNavigation as EventListener,
      );
      window.removeEventListener(
        ROUTE_LOADING_STOP_EVENT,
        onStopNavigation as EventListener,
      );
      clearNavigationTimers();
    };
  }, []);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    endNavigationRef.current();
  }, [routeKey]);

  return (
    <div
      aria-hidden={!isVisible}
      className={cn(
        "pointer-events-none fixed inset-x-0 top-5 z-[120] flex justify-center px-4 transition-all duration-200 ease-out",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0",
      )}
    >
      <div
        role="status"
        aria-live="polite"
        className="panel-shell w-full max-w-sm rounded-[1.75rem] px-4 py-3 shadow-[0_30px_90px_-54px_var(--shadow-color)]"
      >
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/80 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
            <Loader2 className="size-4 animate-spin" />
          </span>

          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Navigating
            </p>
            <p className="text-sm font-medium tracking-[-0.02em] text-foreground">
              Loading the next page
            </p>
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/8">
          <div className="route-loading-bar h-full w-24 rounded-full bg-foreground/80" />
        </div>
      </div>
    </div>
  );
};

export { RouteLoadingOverlay };
