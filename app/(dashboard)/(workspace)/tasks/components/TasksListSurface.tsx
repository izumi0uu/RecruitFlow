"use client";

import NumberFlow from "@number-flow/react";
import type {
  ApiTaskEntityType,
  TaskMutationResponse,
  TaskRecord,
  TaskStatusActionRequest,
  TasksListResponse,
} from "@recruitflow/contracts";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  Filter,
  Inbox,
  ListChecks,
  ListTodo,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TimerReset,
  UserRound,
  UserSearch,
  UsersRound,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { FormEvent, KeyboardEvent, ReactNode } from "react";
import { useEffect, useState } from "react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { type FilterTabOption, FilterTabs } from "@/components/ui/FilterTabs";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  WorkspaceListStatusBadge,
  WorkspaceListSurfaceShell,
} from "@/components/workspace/WorkspaceListSurfaceShell";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import type { TaskListFilters } from "@/lib/tasks/filters";
import { cn } from "@/lib/utils";

import {
  formatTaskDate,
  formatTaskDetailDate,
  formatTaskLabel,
  getTaskEntityHref,
  taskEntityToneMap,
  taskEntityTypeOptions,
  taskRailToneMap,
  taskStatusOptions,
  taskStatusToneMap,
} from "../utils";
import { useTaskStatusActionMutation } from "./hooks/useTaskMutations";
import { useTasksListSurface } from "./hooks/useTasksListSurface";
import { TaskMutationDialog } from "./TaskMutationDialog";

type TasksListSurfaceProps = {
  initialData: TasksListResponse;
  initialFilters: TaskListFilters;
};

type TaskGroupKey = "overdue" | "open" | "snoozed" | "done";

type TaskStatusActionState = {
  error: string | null;
  isPending: boolean;
  pendingAction: TaskStatusActionRequest["action"] | null;
  pendingTaskId: string | null;
};

type TaskStatusActionHandler = (
  task: TaskRecord,
  input: TaskStatusActionRequest,
) => void;

type TaskFilterOption = {
  label: string;
  value: string;
};

const taskMotionTransition = {
  duration: 0.28,
  ease: [0.22, 1, 0.36, 1],
} as const;

const instantMotionTransition = { duration: 0 } as const;

const taskEntityIconMap: Record<ApiTaskEntityType, LucideIcon> = {
  candidate: UserSearch,
  client: Building2,
  job: BriefcaseBusiness,
  submission: ListChecks,
};

const taskGroupMeta: Record<
  TaskGroupKey,
  { description: string; icon: LucideIcon; title: string }
> = {
  done: {
    description: "Completed work",
    icon: CheckCircle2,
    title: "Done",
  },
  open: {
    description: "Ready to work",
    icon: ListTodo,
    title: "Open",
  },
  overdue: {
    description: "Past due",
    icon: TimerReset,
    title: "Overdue",
  },
  snoozed: {
    description: "Scheduled to return",
    icon: Bell,
    title: "Snoozed",
  },
};

const taskGroupOrder: TaskGroupKey[] = ["overdue", "open", "snoozed", "done"];

const taskViewMeta: Record<
  TaskListFilters["view"],
  {
    countLabel: string;
    description: string;
    icon: LucideIcon;
    label: string;
    tone: string;
  }
> = {
  done: {
    countLabel: "closed",
    description: "Completed handoffs",
    icon: CheckCircle2,
    label: "Done",
    tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  mine: {
    countLabel: "mine",
    description: "Personal triage",
    icon: UserRound,
    label: "My Tasks",
    tone: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  overdue: {
    countLabel: "late",
    description: "Past due work",
    icon: TimerReset,
    label: "Overdue",
    tone: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
  snoozed: {
    countLabel: "parked",
    description: "Scheduled return",
    icon: Bell,
    label: "Snoozed",
    tone: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  workspace: {
    countLabel: "active",
    description: "Team operating view",
    icon: UsersRound,
    label: "Workspace",
    tone: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
};

const taskViewOrder: TaskListFilters["view"][] = [
  "mine",
  "workspace",
  "overdue",
  "snoozed",
  "done",
];

const getTransition = (shouldReduceMotion: boolean) =>
  shouldReduceMotion ? instantMotionTransition : taskMotionTransition;

const getDefaultSnoozeDate = () => {
  const value = new Date();
  value.setDate(value.getDate() + 1);

  return value.toISOString().slice(0, 10);
};

const TaskBadge = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
      className,
    )}
  >
    {children}
  </span>
);

const getTaskGroupKey = (task: TaskRecord): TaskGroupKey => {
  if (task.status === "done") {
    return "done";
  }

  if (task.isOverdue) {
    return "overdue";
  }

  if (task.status === "snoozed") {
    return "snoozed";
  }

  return "open";
};

const groupTasks = (tasks: TaskRecord[]) => {
  const groups = new Map<TaskGroupKey, TaskRecord[]>(
    taskGroupOrder.map((group) => [group, []]),
  );

  for (const task of tasks) {
    groups.get(getTaskGroupKey(task))?.push(task);
  }

  return taskGroupOrder
    .map((group) => ({
      group,
      items: groups.get(group) ?? [],
    }))
    .filter((section) => section.items.length > 0);
};

const TasksSummaryMetric = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) => (
  <motion.div
    layout
    transition={taskMotionTransition}
    className="min-w-0 rounded-[1rem] border border-border/70 bg-workspace-muted-surface/68 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
  >
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="size-3.5" />
      <p className="truncate text-[0.66rem] font-semibold uppercase tracking-[0.18em]">
        {label}
      </p>
    </div>
    <p className="mt-1.5 text-xl font-semibold text-foreground">
      <NumberFlow value={value} />
    </p>
  </motion.div>
);

const TasksSummaryDock = ({ tasksList }: { tasksList: TasksListResponse }) => (
  <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[32rem]">
    <TasksSummaryMetric
      icon={ListTodo}
      label="Mine"
      value={tasksList.summary.mineCount}
    />
    <TasksSummaryMetric
      icon={TimerReset}
      label="Overdue"
      value={tasksList.summary.overdueCount}
    />
    <TasksSummaryMetric
      icon={Bell}
      label="Snoozed"
      value={tasksList.summary.snoozedCount}
    />
    <TasksSummaryMetric
      icon={CheckCircle2}
      label="Done"
      value={tasksList.summary.doneCount}
    />
  </div>
);

const TasksActionDock = ({
  onCreateTask,
  tasksList,
}: {
  onCreateTask: () => void;
  tasksList: TasksListResponse;
}) => (
  <div className="flex w-full flex-col gap-3 xl:w-[32rem]">
    {tasksList.permissions.canCreateTask ? (
      <Button
        className="w-full justify-center rounded-full"
        type="button"
        onClick={onCreateTask}
      >
        <Plus className="size-4" />
        Create task
      </Button>
    ) : (
      <p className="status-message border-border/70 bg-surface-1/70 text-muted-foreground">
        Task creation is unavailable for your role.
      </p>
    )}
    <TasksSummaryDock tasksList={tasksList} />
  </div>
);

const getTaskViewCount = (
  view: TaskListFilters["view"],
  tasksList: TasksListResponse,
) => {
  switch (view) {
    case "done":
      return tasksList.summary.doneCount;
    case "overdue":
      return tasksList.summary.overdueCount;
    case "snoozed":
      return tasksList.summary.snoozedCount;
    case "workspace":
      return tasksList.summary.workspaceActiveCount;
    default:
      return tasksList.summary.mineCount;
  }
};

const getOptionLabel = (options: TaskFilterOption[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value;

const TaskFilterScopeRail = ({
  filters,
  hasFilters,
  onClearEntity,
  onClearOwner,
  onClearSearch,
  onClearStatus,
  onReset,
  ownerOptions,
  tasksList,
}: {
  filters: TaskListFilters;
  hasFilters: boolean;
  onClearEntity: () => void;
  onClearOwner: () => void;
  onClearSearch: () => void;
  onClearStatus: () => void;
  onReset: () => void;
  ownerOptions: TaskFilterOption[];
  tasksList: TasksListResponse;
}) => {
  const activeFineFilters = [
    filters.q
      ? {
          key: "search",
          label: "Search",
          onClear: onClearSearch,
          value: filters.q,
        }
      : null,
    filters.owner
      ? {
          key: "owner",
          label: "Owner",
          onClear: onClearOwner,
          value: getOptionLabel(ownerOptions, filters.owner),
        }
      : null,
    filters.entityType
      ? {
          key: "entity",
          label: "Entity",
          onClear: onClearEntity,
          value: getOptionLabel(taskEntityTypeOptions, filters.entityType),
        }
      : null,
    filters.status
      ? {
          key: "status",
          label: "Status",
          onClear: onClearStatus,
          value: getOptionLabel(taskStatusOptions, filters.status),
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="rounded-[1.25rem] border border-border/70 bg-background/48 px-3 py-2">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/70 bg-surface-1/70 px-2.5 text-xs font-semibold text-foreground">
            <Target className="size-3.5 text-muted-foreground" />
            {taskViewMeta[filters.view].label}
          </span>
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/70 bg-surface-1/70 px-2.5 text-xs font-medium text-muted-foreground">
            <SlidersHorizontal className="size-3.5" />
            <NumberFlow value={tasksList.pagination.totalItems} /> matching
          </span>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {activeFineFilters.length > 0 ? (
            activeFineFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-border/70 bg-workspace-muted-surface/70 px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20"
                onClick={filter.onClear}
              >
                <span className="shrink-0 text-muted-foreground/80">
                  {filter.label}
                </span>
                <span className="min-w-0 truncate text-foreground">
                  {filter.value}
                </span>
                <X className="size-3.5 shrink-0" />
              </button>
            ))
          ) : (
            <span className="inline-flex h-7 items-center rounded-full border border-border/70 bg-workspace-muted-surface/60 px-2.5 text-xs font-medium text-muted-foreground">
              No fine filters
            </span>
          )}

          {hasFilters ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-full px-2.5 text-xs"
              onClick={onReset}
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const TaskEntityMark = ({ task }: { task: TaskRecord }) => {
  const linkedEntity = task.linkedEntity;
  const Icon = linkedEntity ? taskEntityIconMap[linkedEntity.type] : Inbox;

  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-[1rem] border bg-background/72",
        linkedEntity
          ? taskEntityToneMap[linkedEntity.type]
          : "border-border/70 text-muted-foreground",
      )}
    >
      <Icon className="size-4" />
    </span>
  );
};

const TaskStatusActions = ({
  compact = false,
  onOpenSnooze,
  onStatusAction,
  state,
  task,
}: {
  compact?: boolean;
  onOpenSnooze: (task: TaskRecord) => void;
  onStatusAction: TaskStatusActionHandler;
  state: TaskStatusActionState;
  task: TaskRecord;
}) => {
  const isTaskPending = state.isPending && state.pendingTaskId === task.id;
  const pendingAction = isTaskPending ? state.pendingAction : null;
  const canComplete = task.canComplete;
  const canSnooze = task.canSnooze;
  const canReopen = task.canReopen;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        compact ? "lg:justify-end" : "w-full",
      )}
    >
      {canComplete ? (
        <Button
          aria-label="Complete task"
          className="rounded-full"
          disabled={state.isPending}
          size="sm"
          type="button"
          variant="outline"
          onClick={(event) => {
            event.stopPropagation();
            onStatusAction(task, { action: "complete" });
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
          }}
        >
          {pendingAction === "complete" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3.5" />
          )}
          Done
        </Button>
      ) : null}

      {canSnooze ? (
        <Button
          aria-label="Snooze task"
          className="rounded-full"
          disabled={state.isPending}
          size="sm"
          type="button"
          variant="outline"
          onClick={(event) => {
            event.stopPropagation();
            onOpenSnooze(task);
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
          }}
        >
          {pendingAction === "snooze" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Bell className="size-3.5" />
          )}
          Snooze
        </Button>
      ) : null}

      {canReopen ? (
        <Button
          aria-label="Reopen task"
          className="rounded-full"
          disabled={state.isPending}
          size="sm"
          type="button"
          variant="outline"
          onClick={(event) => {
            event.stopPropagation();
            onStatusAction(task, { action: "reopen" });
          }}
          onKeyDown={(event) => {
            event.stopPropagation();
          }}
        >
          {pendingAction === "reopen" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RotateCcw className="size-3.5" />
          )}
          Reopen
        </Button>
      ) : null}
    </div>
  );
};

const TaskRow = ({
  isSelected,
  onOpenSnooze,
  onSelect,
  onStatusAction,
  statusActionState,
  task,
}: {
  isSelected: boolean;
  onOpenSnooze: (task: TaskRecord) => void;
  onSelect: () => void;
  onStatusAction: TaskStatusActionHandler;
  statusActionState: TaskStatusActionState;
  task: TaskRecord;
}) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const transition = getTransition(shouldReduceMotion);
  const linkedEntity = task.linkedEntity;
  const entityHref = getTaskEntityHref(task);
  const railTone = task.isOverdue ? "overdue" : task.status;
  const dueLabel = task.isOverdue ? "Overdue" : formatTaskDate(task.dueAt);
  const reminderLabel = task.snoozedUntil
    ? formatTaskDate(task.snoozedUntil)
    : null;
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <motion.article
      layout
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={transition}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className={cn(
        "group relative grid cursor-pointer gap-4 border-t border-border/60 bg-background/18 px-4 py-4 outline-none transition-[background-color,box-shadow] duration-200 first:border-t-0 hover:bg-workspace-muted-surface/38 focus-visible:bg-workspace-muted-surface/44 md:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(9rem,0.22fr)_minmax(10rem,0.24fr)_auto] lg:items-center",
        isSelected &&
          "bg-workspace-muted-surface/72 shadow-[inset_0_0_0_1px_var(--border),0_18px_44px_-38px_var(--shadow-color)]",
      )}
    >
      <span
        className={cn(
          "absolute bottom-4 left-0 top-4 w-1 rounded-r-full",
          taskRailToneMap[railTone],
        )}
      />

      <div className="flex min-w-0 items-start gap-3">
        <TaskEntityMark task={task} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <TaskBadge
              className={
                task.isOverdue
                  ? "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  : taskStatusToneMap[task.status]
              }
            >
              {task.isOverdue ? "Overdue" : formatTaskLabel(task.status)}
            </TaskBadge>
            {linkedEntity ? (
              <TaskBadge className={taskEntityToneMap[linkedEntity.type]}>
                {formatTaskLabel(linkedEntity.type)}
              </TaskBadge>
            ) : null}
          </div>

          <h2 className="mt-3 truncate text-lg font-semibold text-foreground">
            {task.title}
          </h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {linkedEntity?.trail.join(" / ") ?? "No linked entity"}
          </p>
          {task.description ? (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-foreground/86">
              {task.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-[1.15rem] border border-border/65 bg-background/46 px-3 py-3">
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Due
        </p>
        <div className="mt-3 flex items-center gap-2">
          <CalendarClock className="size-4 text-muted-foreground" />
          <p className="min-w-0 truncate text-sm font-medium text-foreground">
            {dueLabel}
          </p>
        </div>
        {task.status === "snoozed" && reminderLabel ? (
          <div className="mt-2 flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-300">
            <Bell className="size-3.5" />
            <p className="min-w-0 truncate">Returns {reminderLabel}</p>
          </div>
        ) : null}
      </div>

      <div className="rounded-[1.15rem] border border-border/65 bg-background/46 px-3 py-3">
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Owner
        </p>
        <div className="mt-3 flex items-center gap-2">
          <UserRound className="size-4 text-muted-foreground" />
          <p className="min-w-0 truncate text-sm font-medium text-foreground">
            {task.assignedTo?.name ?? task.assignedTo?.email ?? "Unassigned"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <TaskStatusActions
          compact
          task={task}
          state={statusActionState}
          onOpenSnooze={onOpenSnooze}
          onStatusAction={onStatusAction}
        />
        {entityHref ? (
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <TrackedLink
              href={entityHref}
              onClick={(event) => {
                event.stopPropagation();
              }}
              onKeyDown={(event) => {
                event.stopPropagation();
              }}
            >
              Open
              <ArrowUpRight className="size-3.5" />
            </TrackedLink>
          </Button>
        ) : null}
      </div>
    </motion.article>
  );
};

const TaskGroupSection = ({
  children,
  group,
  totalItems,
}: {
  children: ReactNode;
  group: TaskGroupKey;
  totalItems: number;
}) => {
  const meta = taskGroupMeta[group];
  const Icon = meta.icon;

  return (
    <section className="border-t border-border/70 first:border-t-0">
      <div className="flex items-center justify-between gap-3 bg-workspace-muted-surface/52 px-4 py-3 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[0.9rem] border border-border/70 bg-background/70">
            <Icon className="size-4 text-muted-foreground" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {meta.title}
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              {meta.description}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          {totalItems}
        </span>
      </div>
      {children}
    </section>
  );
};

const TaskContextPanel = ({
  onEditTask,
  onOpenSnooze,
  onStatusAction,
  statusActionState,
  task,
}: {
  onEditTask: (task: TaskRecord) => void;
  onOpenSnooze: (task: TaskRecord) => void;
  onStatusAction: TaskStatusActionHandler;
  statusActionState: TaskStatusActionState;
  task: TaskRecord | null;
}) => {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const transition = getTransition(shouldReduceMotion);
  const entityHref = task ? getTaskEntityHref(task) : null;

  return (
    <aside className="border-t border-border/70 bg-workspace-muted-surface/58 p-4 shadow-[inset_1px_0_0_rgba(255,255,255,0.08)] lg:sticky lg:top-5 lg:max-h-[calc(100dvh-2.5rem)] lg:self-start lg:overflow-y-auto lg:border-l lg:border-t-0 lg:p-5 xl:top-6 xl:max-h-[calc(100dvh-3rem)]">
      <AnimatePresence mode="wait">
        {task ? (
          <motion.div
            key={task.id}
            initial={
              shouldReduceMotion ? { opacity: 1 } : { opacity: 0, x: 12 }
            }
            animate={{ opacity: 1, x: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
            transition={transition}
            className="space-y-5"
          >
            <div>
              <span className="inline-kicker">Context</span>
              <h2 className="mt-3 text-xl font-semibold text-foreground">
                {task.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {task.linkedEntity?.trail.join(" / ") ?? "No linked entity"}
              </p>
            </div>

            <div className="grid gap-2">
              {[
                [
                  "Status",
                  task.isOverdue ? "Overdue" : formatTaskLabel(task.status),
                ],
                ["Due", formatTaskDetailDate(task.dueAt)],
                ["Snoozed", formatTaskDetailDate(task.snoozedUntil)],
                [
                  "Owner",
                  task.assignedTo?.name ??
                    task.assignedTo?.email ??
                    "Unassigned",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[1rem] border border-border/70 bg-background/72 px-3 py-3"
                >
                  <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {task.description ? (
              <div className="rounded-[1.15rem] border border-border/70 bg-background/68 px-4 py-4">
                <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Note
                </p>
                <p className="mt-3 text-sm leading-6 text-foreground/88">
                  {task.description}
                </p>
              </div>
            ) : null}

            <div className="grid gap-2">
              <TaskStatusActions
                task={task}
                state={statusActionState}
                onOpenSnooze={onOpenSnooze}
                onStatusAction={onStatusAction}
              />

              {task.canEdit ? (
                <Button
                  className="w-full justify-center rounded-full"
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onEditTask(task);
                  }}
                >
                  <Pencil className="size-4" />
                  Edit task
                </Button>
              ) : (
                <p className="status-message border-border/70 bg-background/70 text-muted-foreground">
                  <ShieldCheck className="size-4" />
                  Edits are limited to owners and recruiters.
                </p>
              )}

              {entityHref ? (
                <Button asChild className="w-full justify-center rounded-full">
                  <TrackedLink href={entityHref}>
                    Open linked record
                    <ArrowUpRight className="size-4" />
                  </TrackedLink>
                </Button>
              ) : null}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            className="flex min-h-72 flex-col items-center justify-center text-center"
          >
            <span className="flex size-12 items-center justify-center rounded-[1.1rem] border border-border/70 bg-surface-1">
              <Inbox className="size-5 text-muted-foreground" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              No task selected
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
              Task context appears here when the current view has records.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
};

const TaskSnoozeDialog = ({
  onOpenChange,
  onStatusAction,
  open,
  state,
  task,
}: {
  onOpenChange: (open: boolean) => void;
  onStatusAction: TaskStatusActionHandler;
  open: boolean;
  state: TaskStatusActionState;
  task: TaskRecord | null;
}) => {
  const [reminderDate, setReminderDate] = useState(getDefaultSnoozeDate);
  const isPending =
    state.isPending &&
    state.pendingAction === "snooze" &&
    state.pendingTaskId === task?.id;

  useEffect(() => {
    if (!open) {
      return;
    }

    setReminderDate(task?.snoozedUntil?.slice(0, 10) ?? getDefaultSnoozeDate());
  }, [open, task]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!task) {
      return;
    }

    onStatusAction(task, {
      action: "snooze",
      snoozedUntil: reminderDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-4 rounded-[1.35rem] p-5">
        <DialogHeader className="pr-10">
          <DialogTitle className="text-xl">Snooze task</DialogTitle>
          <DialogDescription className="text-sm leading-6">
            Choose the date this task should return to the active queue.
          </DialogDescription>
        </DialogHeader>

        {task ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="rounded-[1rem] border border-border/70 bg-workspace-muted-surface/48 px-3 py-3">
              <p className="truncate text-sm font-medium text-foreground">
                {task.title}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {task.linkedEntity?.trail.join(" / ") ?? "No linked entity"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-snooze-reminder">Reminder date</Label>
              <Input
                id="task-snooze-reminder"
                type="date"
                required
                leadingIcon={<CalendarClock className="size-4" />}
                value={reminderDate}
                disabled={isPending}
                onChange={(event) => {
                  setReminderDate(event.target.value);
                }}
              />
            </div>

            {state.error && state.pendingTaskId === task.id ? (
              <p className="status-message status-error">{state.error}</p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-3">
              <DialogClose asChild>
                <Button
                  className="rounded-full"
                  disabled={isPending}
                  type="button"
                  variant="outline"
                >
                  Close
                </Button>
              </DialogClose>
              <Button
                className="rounded-full"
                disabled={isPending}
                type="submit"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Bell className="size-4" />
                )}
                Snooze
              </Button>
            </div>
          </form>
        ) : (
          <p className="status-message border-border/70 bg-surface-1/70 text-muted-foreground">
            Select a task to snooze.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

const TasksEmptyState = ({
  hasFilters,
  onReset,
}: {
  hasFilters: boolean;
  onReset: () => void;
}) => (
  <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-[1.55rem] border border-dashed border-border/75 bg-background/38 px-6 py-14 text-center">
    <span className="mx-auto flex size-14 items-center justify-center rounded-[1.35rem] border border-border/70 bg-surface-1">
      <Inbox className="size-5 text-foreground" />
    </span>
    <h2 className="mt-5 text-xl font-semibold text-foreground">
      {hasFilters ? "No matching tasks" : "No tasks in this view"}
    </h2>
    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
      {hasFilters
        ? "Try a broader owner, entity, status, or search filter."
        : "This workspace view is clear."}
    </p>
    {hasFilters ? (
      <Button
        className="mt-6 rounded-full"
        type="button"
        variant="outline"
        onClick={onReset}
      >
        <RotateCcw className="size-4" />
        Reset filters
      </Button>
    ) : null}
  </div>
);

const TasksLoadingState = () => (
  <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 py-14 text-center">
    <span className="flex size-12 items-center justify-center rounded-full border border-border/70 bg-surface-1">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </span>
    <div>
      <p className="text-sm font-medium text-foreground">Loading tasks</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        The workspace task query is refreshing.
      </p>
    </div>
  </div>
);

const TasksListSurface = ({
  initialData,
  initialFilters,
}: TasksListSurfaceProps) => {
  const {
    applyFilters,
    currentPage,
    error,
    filterCount,
    filters,
    getTaskSelectionProps,
    hasFilters,
    isError,
    isFetching,
    ownerOptions,
    refetch,
    resetFilters,
    searchDraft,
    selectedTask,
    setSearchDraft,
    taskItems,
    tasksList,
    totalPages,
  } = useTasksListSurface({
    initialData,
    initialFilters,
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [snoozingTask, setSnoozingTask] = useState<TaskRecord | null>(null);
  const groupedTasks = groupTasks(taskItems);
  const hasTaskItems = taskItems.length > 0;
  const taskViewOptions = taskViewOrder.map(
    (view): FilterTabOption<TaskListFilters["view"]> => ({
      ...taskViewMeta[view],
      count: getTaskViewCount(view, tasksList),
      value: view,
    }),
  );
  const handleTaskSaved = (_response: TaskMutationResponse) => {
    void refetch();
  };
  const {
    applyTaskStatusAction,
    error: statusActionError,
    isPending: isStatusActionPending,
    pendingAction,
    pendingTaskId,
    resetError: resetStatusActionError,
  } = useTaskStatusActionMutation({
    onSuccess: (response) => {
      setSnoozingTask(null);
      handleTaskSaved(response);
    },
  });
  const statusActionState: TaskStatusActionState = {
    error: statusActionError,
    isPending: isStatusActionPending,
    pendingAction,
    pendingTaskId,
  };
  const handleStatusAction: TaskStatusActionHandler = (task, input) => {
    applyTaskStatusAction({ input, taskId: task.id });
  };

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="Execution inbox"
        title="Tasks"
        description="A workspace-scoped task inbox for recruiter follow-ups, overdue work, and snoozed execution context."
        rightSlotClassName="w-full xl:w-auto"
        rightSlot={
          <TasksActionDock
            tasksList={tasksList}
            onCreateTask={() => {
              setIsCreateDialogOpen(true);
            }}
          />
        }
      />

      <WorkspaceListSurfaceShell
        className="lg:overflow-visible"
        contentClassName="lg:overflow-visible"
        filterBadges={
          <>
            <WorkspaceListStatusBadge>
              {filterCount ? `${filterCount} active filters` : "My Tasks"}
            </WorkspaceListStatusBadge>
            <WorkspaceListStatusBadge>
              {tasksList.workspaceScoped ? "Workspace scoped" : "Scope pending"}
            </WorkspaceListStatusBadge>
            {isFetching ? (
              <WorkspaceListStatusBadge className="border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                <Loader2 className="size-3 animate-spin" />
                Refreshing
              </WorkspaceListStatusBadge>
            ) : null}
          </>
        }
        filterControlsClassName="lg:grid-cols-4"
        filterControls={
          <>
            <div className="lg:col-span-4">
              <FilterTabs
                disabled={isFetching}
                layoutId="task-view-tab"
                options={taskViewOptions}
                value={filters.view}
                onValueChange={(view) => {
                  applyFilters({ page: "", status: "", view });
                }}
              />
            </div>

            <div className="lg:col-span-4">
              <TaskFilterScopeRail
                filters={filters}
                hasFilters={hasFilters}
                ownerOptions={ownerOptions}
                tasksList={tasksList}
                onClearEntity={() => {
                  applyFilters({ entityId: "", entityType: "", page: "" });
                }}
                onClearOwner={() => {
                  applyFilters({ owner: "", page: "" });
                }}
                onClearSearch={() => {
                  setSearchDraft("");
                  applyFilters({ page: "", q: "" });
                }}
                onClearStatus={() => {
                  applyFilters({ page: "", status: "" });
                }}
                onReset={resetFilters}
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Search
              </span>
              <Input
                leadingIcon={<Search className="size-4" />}
                placeholder="Task, client, role, or candidate"
                value={searchDraft}
                onChange={(event) => {
                  setSearchDraft(event.target.value);
                }}
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Owner
              </span>
              <FilterSelect
                value={filters.owner}
                options={ownerOptions}
                placeholder="All owners"
                onValueChange={(owner) => {
                  applyFilters({ owner, page: "" });
                }}
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Entity
              </span>
              <FilterSelect
                value={filters.entityType}
                options={[
                  { label: "All entities", value: "" },
                  ...taskEntityTypeOptions,
                ]}
                placeholder="All entities"
                onValueChange={(entityType) => {
                  applyFilters({
                    entityType: entityType as TaskListFilters["entityType"],
                    page: "",
                  });
                }}
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Status
              </span>
              <FilterSelect
                value={filters.status}
                options={[
                  { label: "Any status", value: "" },
                  ...taskStatusOptions,
                ]}
                placeholder="Any status"
                onValueChange={(status) => {
                  applyFilters({
                    page: "",
                    status: status as TaskListFilters["status"],
                  });
                }}
              />
            </div>
          </>
        }
        alerts={
          <>
            {statusActionError ? (
              <div className="rounded-[1.35rem] border border-destructive/30 bg-destructive/10 p-4">
                <p className="text-sm font-medium text-foreground">
                  Unable to update task status.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {statusActionError}
                </p>
                <Button
                  className="mt-4 rounded-full"
                  type="button"
                  variant="outline"
                  onClick={resetStatusActionError}
                >
                  <RotateCcw className="size-4" />
                  Dismiss
                </Button>
              </div>
            ) : null}

            {isError ? (
              <div className="rounded-[1.35rem] border border-destructive/30 bg-destructive/10 p-4">
                <p className="text-sm font-medium text-foreground">
                  Unable to refresh tasks.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {error instanceof Error
                    ? error.message
                    : "The tasks API returned an unexpected error."}
                </p>
                <Button
                  className="mt-4 rounded-full"
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void refetch();
                  }}
                >
                  <RotateCcw className="size-4" />
                  Retry
                </Button>
              </div>
            ) : null}
          </>
        }
        pagination={{
          currentPage,
          disabled: isFetching,
          onNext: () => {
            applyFilters({ page: String(currentPage + 1) });
          },
          onPrevious: () => {
            applyFilters({
              page: currentPage - 1 > 1 ? String(currentPage - 1) : "",
            });
          },
          pageSize: tasksList.pagination.pageSize,
          totalItems: tasksList.pagination.totalItems,
          totalPages,
        }}
        footerNote={{
          icon: <Filter className="size-4 text-muted-foreground" />,
          title: "Task scope",
          children:
            "Every row is read through the active workspace and keeps its linked business record visible.",
        }}
      >
        <div className="grid min-h-[34rem] lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-stretch">
          <div className="min-h-[34rem] min-w-0">
            <AnimatePresence mode="popLayout">
              {!hasTaskItems && isFetching ? (
                <motion.div key="loading" layout>
                  <TasksLoadingState />
                </motion.div>
              ) : hasTaskItems ? (
                <div key="tasks">
                  {groupedTasks.map((section) => (
                    <TaskGroupSection
                      key={section.group}
                      group={section.group}
                      totalItems={section.items.length}
                    >
                      <AnimatePresence mode="popLayout">
                        {section.items.map((task) => {
                          const selection = getTaskSelectionProps(task);

                          return (
                            <TaskRow
                              key={task.id}
                              task={task}
                              isSelected={selection.isSelected}
                              onOpenSnooze={(targetTask) => {
                                resetStatusActionError();
                                setSnoozingTask(targetTask);
                              }}
                              onSelect={selection.onSelect}
                              onStatusAction={handleStatusAction}
                              statusActionState={statusActionState}
                            />
                          );
                        })}
                      </AnimatePresence>
                    </TaskGroupSection>
                  ))}
                </div>
              ) : (
                <motion.div key="empty" layout className="h-full">
                  <TasksEmptyState
                    hasFilters={hasFilters}
                    onReset={resetFilters}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <TaskContextPanel
            task={selectedTask}
            onOpenSnooze={(task) => {
              resetStatusActionError();
              setSnoozingTask(task);
            }}
            onEditTask={(task) => {
              setEditingTask(task);
            }}
            onStatusAction={handleStatusAction}
            statusActionState={statusActionState}
          />
        </div>
      </WorkspaceListSurfaceShell>

      <TaskMutationDialog
        mode="create"
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onTaskSaved={handleTaskSaved}
        assigneeOptions={tasksList.assigneeOptions}
        ownerOptions={tasksList.ownerOptions}
        permissions={tasksList.permissions}
        entityOptions={tasksList.entityOptions}
        seedTask={selectedTask}
      />

      <TaskMutationDialog
        mode="edit"
        open={Boolean(editingTask)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTask(null);
          }
        }}
        onTaskSaved={handleTaskSaved}
        assigneeOptions={tasksList.assigneeOptions}
        ownerOptions={tasksList.ownerOptions}
        permissions={tasksList.permissions}
        entityOptions={tasksList.entityOptions}
        task={editingTask}
      />

      <TaskSnoozeDialog
        open={Boolean(snoozingTask)}
        onOpenChange={(open) => {
          if (!open) {
            setSnoozingTask(null);
          }
        }}
        onStatusAction={handleStatusAction}
        state={statusActionState}
        task={snoozingTask}
      />
    </section>
  );
};

export { TasksListSurface };
