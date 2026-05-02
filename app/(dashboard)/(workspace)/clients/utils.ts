import type {
  ApiClientEditableStatus,
  ApiClientPriority,
  ApiClientSort,
  ApiClientStatus,
} from "@recruitflow/contracts";
import {
  apiClientEditableStatusValues,
  apiClientPriorityValues,
} from "@recruitflow/contracts";

export const clientStatusOptions: Array<{
  label: string;
  value: ApiClientStatus;
}> = [
  { label: "Active", value: "active" },
  { label: "Prospect", value: "prospect" },
  { label: "Paused", value: "paused" },
  { label: "Archived", value: "archived" },
];

export const clientPriorityOptions: Array<{
  label: string;
  value: ApiClientPriority;
}> = [
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const clientEditableStatusLabelMap: Record<ApiClientEditableStatus, string> = {
  active: "Active",
  paused: "Paused",
  prospect: "Prospect",
};

const clientPriorityLabelMap: Record<ApiClientPriority, string> = {
  high: "High",
  low: "Low",
  medium: "Medium",
};

export const clientEditableStatusOptions = apiClientEditableStatusValues.map(
  (status) => ({
    label: clientEditableStatusLabelMap[status],
    value: status,
  }),
);

export const clientEditablePriorityOptions = apiClientPriorityValues.map(
  (priority) => ({
    label: clientPriorityLabelMap[priority],
    value: priority,
  }),
);

export const clientSortOptions: Array<{
  label: string;
  value: ApiClientSort;
}> = [
  { label: "Name A-Z", value: "name_asc" },
  { label: "Name Z-A", value: "name_desc" },
  { label: "Recently updated", value: "updated_desc" },
  { label: "Highest priority", value: "priority_desc" },
  { label: "Last touched", value: "last_contacted_desc" },
];

export const clientStatusToneMap: Record<ApiClientStatus, string> = {
  active:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  archived: "border-border/70 bg-surface-1 text-muted-foreground",
  paused:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  prospect: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

export const clientListPriorityToneMap: Record<ApiClientPriority, string> = {
  high: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  low: "border-border/70 bg-surface-1 text-muted-foreground",
  medium:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

export const clientDetailPriorityToneMap: Record<ApiClientPriority, string> = {
  high: "bg-foreground text-background",
  low: "bg-surface-1 text-muted-foreground",
  medium: "bg-muted text-foreground",
};

export const archivedClientTagTone =
  "border-border/80 bg-background/72 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]";

export const formatClientLabel = (value: string) =>
  value
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");

export const formatClientShortDate = (
  value: string | null,
  fallback = "No touch yet",
) => {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
};

export const formatClientDate = (
  value: string | null,
  fallback = "Not recorded",
) => {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};
