"use client";

import type {
  ActivityTimelineEvent,
  ApiActivityTimelineEntityType,
  ApiActivityTimelineEventType,
} from "@recruitflow/contracts";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CircleDot,
  FileText,
  GitBranch,
  ListFilter,
  ListTodo,
  Loader2,
  RadioTower,
  RotateCcw,
  StickyNote,
  UsersRound,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useId, useMemo } from "react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import { activityTimelineQueryOptions } from "@/lib/query/options";
import { cn } from "@/lib/utils";

type ActivityTimelinePanelProps = {
  className?: string;
  description?: string;
  entityId: string;
  entityType: ApiActivityTimelineEntityType;
  pageSize?: number;
  title?: string;
};

type ActivityFilterValue = "all" | ApiActivityTimelineEventType;

const activityMotionTransition = {
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1],
} as const;

const instantMotionTransition = { duration: 0 } as const;

const getTransition = (shouldReduceMotion: boolean) =>
  shouldReduceMotion ? instantMotionTransition : activityMotionTransition;

const eventTypeConfig: Record<
  ApiActivityTimelineEventType,
  {
    icon: LucideIcon;
    label: string;
    shortLabel: string;
  }
> = {
  document: {
    icon: FileText,
    label: "Documents",
    shortLabel: "Docs",
  },
  member: {
    icon: UsersRound,
    label: "Members",
    shortLabel: "Team",
  },
  note: {
    icon: StickyNote,
    label: "Notes",
    shortLabel: "Notes",
  },
  record: {
    icon: CircleDot,
    label: "Records",
    shortLabel: "Record",
  },
  submission: {
    icon: GitBranch,
    label: "Pipeline",
    shortLabel: "Pipe",
  },
  task: {
    icon: ListTodo,
    label: "Tasks",
    shortLabel: "Tasks",
  },
};

const eventToneClassMap: Record<ApiActivityTimelineEventType, string> = {
  document:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
  member: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  note: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-200",
  record:
    "border-border/70 bg-workspace-muted-surface/72 text-muted-foreground",
  submission:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  task: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200",
};

const filterOrder: ActivityFilterValue[] = [
  "all",
  "task",
  "submission",
  "document",
  "note",
  "member",
  "record",
];

const activityFilterSearchParam = "activityFilter";

const getActivityFilterValue = (value: string | null): ActivityFilterValue => {
  if (filterOrder.includes(value as ActivityFilterValue)) {
    return value as ActivityFilterValue;
  }

  return "all";
};

const formatEventTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time pending";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getDateGroupLabel = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Undated";
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const dateKey = date.toDateString();

  if (dateKey === today.toDateString()) {
    return "Today";
  }

  if (dateKey === yesterday.toDateString()) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  }).format(date);
};

const groupEventsByDay = (items: ActivityTimelineEvent[]) => {
  const groups = new Map<string, ActivityTimelineEvent[]>();

  for (const item of items) {
    const label = getDateGroupLabel(item.occurredAt);
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }

  return Array.from(groups.entries()).map(([label, events]) => ({
    events,
    label,
  }));
};

const getCount = (
  counts: Partial<Record<ApiActivityTimelineEventType, number>>,
  value: ActivityFilterValue,
  totalCount: number,
) => (value === "all" ? totalCount : (counts[value] ?? 0));

const ActivityLensFilter = ({
  counts,
  disabled,
  onChange,
  totalCount,
  value,
}: {
  counts: Partial<Record<ApiActivityTimelineEventType, number>>;
  disabled: boolean;
  onChange: (value: ActivityFilterValue) => void;
  totalCount: number;
  value: ActivityFilterValue;
}) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const transition = getTransition(shouldReduceMotion);
  const id = useId();

  return (
    <div className="rounded-[1.2rem] border border-border/70 bg-background/58 p-1.5">
      <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filterOrder.map((filterValue) => {
          const isActive = filterValue === value;
          const count = getCount(counts, filterValue, totalCount);
          const Icon =
            filterValue === "all"
              ? ListFilter
              : eventTypeConfig[filterValue].icon;
          const label =
            filterValue === "all"
              ? "All"
              : eventTypeConfig[filterValue].shortLabel;

          return (
            <Button
              key={filterValue}
              type="button"
              variant="ghost"
              aria-pressed={isActive}
              disabled={disabled || (count === 0 && filterValue !== "all")}
              className={cn(
                "relative flex min-h-10 shrink-0 items-center gap-2 rounded-[0.9rem] px-3 text-xs font-semibold text-muted-foreground transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-35",
                isActive && "text-foreground",
              )}
              onClick={() => {
                onChange(filterValue);
              }}
            >
              {isActive ? (
                <motion.span
                  layoutId={`${id}-activity-lens`}
                  transition={transition}
                  className="absolute inset-0 rounded-[0.9rem] border border-border/70 bg-surface-1 shadow-[0_18px_48px_-38px_var(--shadow-color)]"
                />
              ) : null}
              <span className="relative z-10 flex items-center gap-2">
                <Icon className="size-3.5" />
                <span>{label}</span>
                <span
                  className={cn(
                    "rounded-full border border-border/70 bg-background/70 px-1.5 py-0.5 text-[0.62rem] tabular-nums text-muted-foreground",
                    isActive && "text-foreground",
                  )}
                >
                  {count}
                </span>
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

const TimelineEventIcon = ({ event }: { event: ActivityTimelineEvent }) => {
  const Icon = eventTypeConfig[event.type].icon;

  return (
    <span
      className={cn(
        "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-[0.95rem] border bg-background",
        eventToneClassMap[event.type],
      )}
    >
      <Icon className="size-4" />
    </span>
  );
};

const TimelineEntityLink = ({ event }: { event: ActivityTimelineEvent }) => {
  const entity = event.entity;

  if (!entity) {
    return null;
  }

  const content = (
    <>
      <span className="truncate">{entity.label}</span>
      {entity.secondaryLabel ? (
        <span className="truncate text-muted-foreground">
          {entity.secondaryLabel}
        </span>
      ) : null}
    </>
  );

  const className =
    "mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-workspace-muted-surface/62 px-2.5 py-1 text-xs font-medium text-foreground";

  return entity.href ? (
    <TrackedLink href={entity.href} className={className}>
      {content}
    </TrackedLink>
  ) : (
    <span className={className}>{content}</span>
  );
};

const TimelineEvent = ({ event }: { event: ActivityTimelineEvent }) => (
  <motion.li
    layout
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
    transition={activityMotionTransition}
    className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3"
  >
    <div className="relative flex justify-center">
      <span className="absolute bottom-[-1rem] top-10 w-px bg-border/70" />
      <TimelineEventIcon event={event} />
    </div>
    <div className="min-w-0 rounded-[1.1rem] border border-border/70 bg-surface-1/62 px-3 py-3 transition-colors hover:bg-surface-1">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {event.title}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {event.actorLabel} · {formatEventTime(event.occurredAt)}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold",
            eventToneClassMap[event.type],
          )}
        >
          {eventTypeConfig[event.type].label}
        </span>
      </div>
      {event.description ? (
        <p className="mt-2 text-sm leading-6 text-foreground/88">
          {event.description}
        </p>
      ) : null}
      <TimelineEntityLink event={event} />
      {event.metadata.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {event.metadata.map((item) => (
            <span
              key={`${event.id}-${item.label}-${item.value}`}
              className="rounded-full border border-border/70 bg-background/68 px-2 py-1 text-[0.68rem] font-medium text-muted-foreground"
            >
              {item.label}: {item.value}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  </motion.li>
);

const ActivityTimelinePanel = ({
  className,
  description = "Recent operational movement for this record, aggregated from audit events, tasks, documents, submissions, and notes.",
  entityId,
  entityType,
  pageSize = 24,
  title = "Activity timeline",
}: ActivityTimelinePanelProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const activeFilter = getActivityFilterValue(
    searchParams.get(activityFilterSearchParam),
  );
  const shouldReduceMotion = useReducedMotion() ?? false;
  const transition = getTransition(shouldReduceMotion);
  const { data, error, isError, isFetching, refetch } = useQuery(
    activityTimelineQueryOptions({
      entityId,
      entityType,
      pageSize,
    }),
  );
  const items = data?.items ?? [];
  const filteredItems = useMemo(
    () =>
      activeFilter === "all"
        ? items
        : items.filter((item) => item.type === activeFilter),
    [activeFilter, items],
  );
  const groupedItems = useMemo(
    () => groupEventsByDay(filteredItems),
    [filteredItems],
  );
  const counts = data?.summary.countsByType ?? {};
  const totalCount = data?.summary.totalCount ?? 0;
  const isEmpty = !isFetching && items.length === 0 && !isError;
  const isFilteredEmpty =
    !isFetching && items.length > 0 && filteredItems.length === 0;
  const handleFilterChange = useCallback(
    (nextFilter: ActivityFilterValue) => {
      const params = new URLSearchParams(searchParamsString);

      if (nextFilter === "all") {
        params.delete(activityFilterSearchParam);
      } else {
        params.set(activityFilterSearchParam, nextFilter);
      }

      const queryString = params.toString();

      router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`, {
        scroll: false,
      });
    },
    [pathname, router, searchParamsString],
  );

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[1.35rem] border border-border/70 bg-background/70 shadow-[0_24px_80px_-62px_var(--shadow-color)]",
        className,
      )}
    >
      <div className="border-border/70 border-b bg-workspace-muted-surface/45 px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <RadioTower className="size-4" />
              {title}
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          {isFetching && items.length > 0 ? (
            <span className="flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Syncing
            </span>
          ) : null}
        </div>
        <div className="mt-4">
          <ActivityLensFilter
            counts={counts}
            disabled={isFetching && items.length === 0}
            onChange={handleFilterChange}
            totalCount={totalCount}
            value={activeFilter}
          />
        </div>
      </div>

      <div className="px-4 py-4">
        {isError ? (
          <div className="rounded-[1.1rem] border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm font-medium text-foreground">
              Unable to load activity.
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "The activity API returned an unexpected error."}
            </p>
            <Button
              className="mt-3 rounded-full"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => {
                void refetch();
              }}
            >
              <RotateCcw className="size-3.5" />
              Retry
            </Button>
          </div>
        ) : null}

        <AnimatePresence mode="popLayout">
          {isFetching && items.length === 0 ? (
            <motion.div
              key="loading"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              className="flex min-h-40 items-center justify-center rounded-[1.1rem] border border-border/70 bg-surface-1/60"
            >
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </motion.div>
          ) : null}

          {isEmpty ? (
            <motion.div
              key="empty"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              className="rounded-[1.1rem] border border-dashed border-border bg-surface-1/60 p-5"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[1rem] border border-border/70 bg-background text-muted-foreground">
                  <Activity className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    No activity yet.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    New tasks, stage moves, documents, and notes will appear
                    here once the API records them.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : null}

          {isFilteredEmpty ? (
            <motion.div
              key="filtered-empty"
              initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              className="rounded-[1.1rem] border border-dashed border-border bg-surface-1/60 p-5 text-sm leading-6 text-muted-foreground"
            >
              This lens has no matching events in the current activity window.
            </motion.div>
          ) : null}

          {groupedItems.length > 0 ? (
            <motion.div
              key="events"
              layout
              transition={transition}
              className="space-y-5"
            >
              {groupedItems.map((group) => (
                <section key={group.label} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-border/70" />
                    <p className="shrink-0 text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {group.label}
                    </p>
                    <span className="h-px flex-1 bg-border/70" />
                  </div>
                  <ul className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {group.events.map((event) => (
                        <TimelineEvent key={event.id} event={event} />
                      ))}
                    </AnimatePresence>
                  </ul>
                </section>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
};

export { ActivityTimelinePanel };
