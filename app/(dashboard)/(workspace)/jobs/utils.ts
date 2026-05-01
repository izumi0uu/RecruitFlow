import type {
  ApiJobPriority,
  ApiJobSort,
  ApiJobStatus,
  JobsListItem,
} from "@recruitflow/contracts";

import type { JobListFilters } from "@/lib/jobs/filters";

import type { JobFormValues } from "./actions";

export const jobStatusOptions: Array<{
  label: string;
  value: ApiJobStatus;
}> = [
  { label: "Intake", value: "intake" },
  { label: "Open", value: "open" },
  { label: "On hold", value: "on_hold" },
  { label: "Closed", value: "closed" },
  { label: "Filled", value: "filled" },
];

export const jobPriorityOptions: Array<{
  label: string;
  value: ApiJobPriority;
}> = [
  { label: "Urgent", value: "urgent" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

export const jobSortOptions: Array<{
  label: string;
  value: ApiJobSort;
}> = [
  { label: "Recently opened", value: "opened_desc" },
  { label: "Recently updated", value: "updated_desc" },
  { label: "Title A-Z", value: "title_asc" },
  { label: "Highest priority", value: "priority_desc" },
  { label: "Target fill date", value: "target_fill_asc" },
];

export const jobStatusToneMap: Record<ApiJobStatus, string> = {
  closed: "border-border/70 bg-surface-1 text-muted-foreground",
  filled:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  intake: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  on_hold:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  open: "border-lime-500/25 bg-lime-500/10 text-lime-700 dark:text-lime-300",
};

export const jobPriorityToneMap: Record<ApiJobPriority, string> = {
  high: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  low: "border-border/70 bg-surface-1 text-muted-foreground",
  medium:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  urgent: "border-foreground bg-foreground text-background",
};

export const formatJobLabel = (value: string) =>
  value
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");

export const formatJobDate = (value: string | null) => {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
};

const getCurrencyCode = (value: string | null) => {
  const currency = value?.trim().toUpperCase() || "USD";

  return /^[A-Z]{3}$/.test(currency) ? currency : "USD";
};

export const formatJobSalary = (job: JobsListItem) => {
  if (job.salaryMin == null && job.salaryMax == null) {
    return "Compensation not set";
  }

  const formatter = new Intl.NumberFormat("en", {
    maximumFractionDigits: 0,
    notation: "compact",
    style: "currency",
    currency: getCurrencyCode(job.currency),
  });

  if (job.salaryMin != null && job.salaryMax != null) {
    return `${formatter.format(job.salaryMin)}-${formatter.format(
      job.salaryMax,
    )}`;
  }

  return formatter.format(job.salaryMin ?? job.salaryMax ?? 0);
};

export const getJobFilterCount = (filters: JobListFilters) =>
  [
    filters.q,
    filters.clientId,
    filters.status,
    filters.owner,
    filters.priority,
    filters.sort !== "opened_desc" ? filters.sort : "",
  ].filter(Boolean).length;

export const emptyJobFormValues: JobFormValues = {
  clientId: "",
  currency: "USD",
  department: "",
  description: "",
  employmentType: "",
  headcount: "1",
  intakeSummary: "",
  location: "",
  ownerUserId: "",
  placementFeePercent: "",
  priority: "medium",
  salaryMax: "",
  salaryMin: "",
  status: "intake",
  targetFillDate: "",
  title: "",
};

export const buildJobFormValues = (
  values: Partial<JobFormValues>,
): JobFormValues => ({
  ...emptyJobFormValues,
  ...values,
});

export const formatDateInputValue = (value: string | null | undefined) =>
  value ? value.slice(0, 10) : "";

export const numericJobFormValue = (value: number | null | undefined) =>
  value == null ? "" : String(value);
