import type {
  ApiTaskEntityType,
  ApiTaskStatus,
  ApiTaskView,
  TaskRecord,
} from "@recruitflow/contracts";

import type { TaskListFilters } from "@/lib/tasks/filters";

export const taskViewOptions: Array<{
  label: string;
  value: ApiTaskView;
}> = [
  { label: "My Tasks", value: "mine" },
  { label: "Workspace", value: "workspace" },
  { label: "Overdue", value: "overdue" },
  { label: "Snoozed", value: "snoozed" },
  { label: "Done", value: "done" },
];

export const taskStatusOptions: Array<{
  label: string;
  value: ApiTaskStatus;
}> = [
  { label: "Open", value: "open" },
  { label: "Snoozed", value: "snoozed" },
  { label: "Done", value: "done" },
];

export const taskEntityTypeOptions: Array<{
  label: string;
  value: ApiTaskEntityType;
}> = [
  { label: "Client", value: "client" },
  { label: "Job", value: "job" },
  { label: "Candidate", value: "candidate" },
  { label: "Submission", value: "submission" },
];

export const taskStatusToneMap: Record<ApiTaskStatus, string> = {
  done: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  open: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  snoozed:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

export const taskRailToneMap: Record<ApiTaskStatus | "overdue", string> = {
  done: "bg-emerald-500/75",
  open: "bg-sky-500/75",
  overdue: "bg-rose-500/80",
  snoozed: "bg-amber-500/75",
};

export const taskEntityToneMap: Record<ApiTaskEntityType, string> = {
  candidate:
    "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  client: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  job: "border-lime-500/25 bg-lime-500/10 text-lime-700 dark:text-lime-300",
  submission:
    "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export const formatTaskLabel = (value: string) =>
  value
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");

export const formatTaskDate = (value: string | null, fallback = "No date") => {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
};

export const formatTaskDetailDate = (
  value: string | null,
  fallback = "Not set",
) => {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

export const getTaskEntityHref = (task: TaskRecord) => {
  const linkedEntity = task.linkedEntity;

  if (!linkedEntity) {
    return null;
  }

  switch (linkedEntity.type) {
    case "candidate":
      return `/candidates/${linkedEntity.id}`;
    case "client":
      return `/clients/${linkedEntity.id}`;
    case "job":
      return `/jobs/${linkedEntity.id}`;
    case "submission": {
      if (!task.submission) {
        return "/pipeline?view=list";
      }

      const params = new URLSearchParams({
        candidateId: task.submission.candidateId,
        jobId: task.submission.jobId,
        view: "list",
      });

      return `/pipeline?${params.toString()}`;
    }
    default:
      return null;
  }
};

export const getTaskFilterCount = (filters: TaskListFilters) =>
  [
    filters.q,
    filters.owner,
    filters.entityType,
    filters.entityId,
    filters.status,
    filters.view !== "mine" ? filters.view : "",
  ].filter(Boolean).length;
