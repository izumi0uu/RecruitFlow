"use client";

import type {
  ApiTaskEntityType,
  ApiUserReference,
  TaskFormEntityOption,
  TaskMutationResponse,
} from "@recruitflow/contracts";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  ListTodo,
  Loader2,
  Plus,
  RotateCcw,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { tasksListQueryOptions } from "@/lib/query/options";
import { normalizeTaskListFilters } from "@/lib/tasks/filters";
import { cn } from "@/lib/utils";

import { formatTaskDate, formatTaskLabel, taskStatusToneMap } from "../utils";
import { TaskMutationDialog } from "./TaskMutationDialog";

type QuickTaskEntity = {
  entityId: string;
  entityType: ApiTaskEntityType;
  label: string;
  secondaryLabel?: string | null;
  trail: string[];
};

type QuickTaskPanelProps = {
  canCreateTask?: boolean;
  className?: string;
  defaultAssignedToUserId?: string | null;
  description?: string;
  entity: QuickTaskEntity;
  ownerOptions: ApiUserReference[];
  title?: string;
};

const quickTaskMotionTransition = {
  duration: 0.22,
  ease: [0.22, 1, 0.36, 1],
} as const;

const instantMotionTransition = { duration: 0 } as const;

const getTransition = (shouldReduceMotion: boolean) =>
  shouldReduceMotion ? instantMotionTransition : quickTaskMotionTransition;

const getTaskStateLabel = (task: {
  dueAt: string | null;
  isOverdue: boolean;
  snoozedUntil: string | null;
  status: string;
}) => {
  if (task.status === "done") {
    return "Completed";
  }

  if (task.status === "snoozed") {
    return `Returns ${formatTaskDate(task.snoozedUntil)}`;
  }

  return task.isOverdue ? "Overdue" : formatTaskDate(task.dueAt);
};

const QuickTaskPanel = ({
  canCreateTask = true,
  className,
  defaultAssignedToUserId,
  description = "Follow-ups linked to this record, shown without leaving the current workflow.",
  entity,
  ownerOptions,
  title = "Tasks",
}: QuickTaskPanelProps) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion() ?? false;
  const transition = getTransition(shouldReduceMotion);
  const filters = useMemo(
    () =>
      normalizeTaskListFilters({
        entityId: entity.entityId,
        entityType: entity.entityType,
        view: "workspace",
      }),
    [entity.entityId, entity.entityType],
  );
  const entityOption = useMemo(
    (): TaskFormEntityOption => ({
      entityId: entity.entityId,
      entityType: entity.entityType,
      label: entity.label,
      secondaryLabel: entity.secondaryLabel ?? null,
      trail: entity.trail,
    }),
    [entity],
  );
  const {
    data: tasksList,
    error,
    isError,
    isFetching,
    refetch,
  } = useQuery(tasksListQueryOptions(filters));
  const items = tasksList?.items ?? [];
  const activeItems = items.filter((task) => task.status !== "done");
  const doneItems = items.filter((task) => task.status === "done");
  const handleTaskCreated = (_response: TaskMutationResponse) => {
    void refetch();
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="size-4" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {canCreateTask ? (
            <Button
              className="shrink-0 rounded-full"
              size="sm"
              type="button"
              onClick={() => {
                setIsCreateDialogOpen(true);
              }}
            >
              <Plus className="size-3.5" />
              Add task
            </Button>
          ) : (
            <span className="status-message border-border/70 bg-surface-1/70 text-muted-foreground">
              Task entry unavailable
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-[1rem] border border-border/70 bg-workspace-muted-surface/50 px-3 py-3">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Active
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {activeItems.length}
            </p>
          </div>
          <div className="rounded-[1rem] border border-border/70 bg-workspace-muted-surface/50 px-3 py-3">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Done
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {doneItems.length}
            </p>
          </div>
          <div className="rounded-[1rem] border border-border/70 bg-workspace-muted-surface/50 px-3 py-3">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Link
            </p>
            <p className="mt-2 truncate text-sm font-semibold text-foreground">
              {formatTaskLabel(entity.entityType)}
            </p>
          </div>
        </div>

        {isError ? (
          <div className="rounded-[1.1rem] border border-destructive/30 bg-destructive/10 p-4">
            <p className="text-sm font-medium text-foreground">
              Unable to load linked tasks.
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "The tasks API returned an unexpected error."}
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

        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {isFetching && items.length === 0 ? (
              <motion.div
                key="loading"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={transition}
                className="flex min-h-24 items-center justify-center rounded-[1.1rem] border border-border/70 bg-surface-1/60"
              >
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </motion.div>
            ) : items.length > 0 ? (
              items.slice(0, 5).map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={
                    shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 }
                  }
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={transition}
                  className="rounded-[1.1rem] border border-border/70 bg-surface-1/65 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {task.title}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        {task.status === "done" ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : task.status === "snoozed" ? (
                          <Bell className="size-3.5" />
                        ) : (
                          <CalendarClock className="size-3.5" />
                        )}
                        <span className="min-w-0 truncate">
                          {getTaskStateLabel(task)}
                        </span>
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold",
                        task.isOverdue
                          ? "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                          : taskStatusToneMap[task.status],
                      )}
                    >
                      {task.isOverdue
                        ? "Overdue"
                        : formatTaskLabel(task.status)}
                    </span>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                key="empty"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={transition}
                className="rounded-[1.1rem] border border-dashed border-border bg-surface-1/60 p-5"
              >
                <p className="text-sm font-medium text-foreground">
                  No linked tasks yet.
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Add the first follow-up from this record and it will appear
                  here.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <TaskMutationDialog
          defaultAssignedToUserId={defaultAssignedToUserId}
          defaultEntityOption={entityOption}
          description={`Create a follow-up already linked to ${entity.label}.`}
          entityOptions={[entityOption]}
          lockEntity
          mode="create"
          open={isCreateDialogOpen}
          ownerOptions={ownerOptions}
          onOpenChange={setIsCreateDialogOpen}
          onTaskSaved={handleTaskCreated}
        />
      </CardContent>
    </Card>
  );
};

export { QuickTaskPanel };
