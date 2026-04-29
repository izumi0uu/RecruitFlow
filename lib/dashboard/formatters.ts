import type { RiskFlag, SubmissionStage, TaskStatus, WorkspaceRole } from "@/lib/db/schema";

const STAGE_LABELS: Record<SubmissionStage, string> = {
  sourced: "Sourced",
  screening: "Screening",
  submitted: "Submitted",
  client_interview: "Client Interview",
  offer: "Offer",
  placed: "Placed",
  lost: "Lost",
};

const RISK_LABELS: Record<RiskFlag, string> = {
  none: "Healthy",
  timing_risk: "Timing Risk",
  feedback_risk: "Feedback Risk",
  compensation_risk: "Comp Risk",
  fit_risk: "Fit Risk",
};

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  recruiter: "Recruiter",
  coordinator: "Coordinator",
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: "Open",
  snoozed: "Snoozed",
  done: "Done",
};

export const humanizeToken = (value: string | null | undefined) => {
  if (!value) return "";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

export const formatStageLabel = (stage: SubmissionStage) => {
  return STAGE_LABELS[stage] ?? humanizeToken(stage);
};

export const formatRiskLabel = (risk: RiskFlag) => {
  return RISK_LABELS[risk] ?? humanizeToken(risk);
};

export const formatRoleLabel = (role: WorkspaceRole) => {
  return ROLE_LABELS[role] ?? humanizeToken(role);
};

export const formatTaskStatusLabel = (status: TaskStatus) => {
  return TASK_STATUS_LABELS[status] ?? humanizeToken(status);
};

export const formatLongDate = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export const formatShortDate = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
};

export const formatCompactDateTime = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export const formatRelativeDate = (date: Date | null | undefined) => {
  if (!date) {
    return "No date";
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffInDays = Math.round(
    (startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000,
  );

  if (diffInDays === 0) {
    return "Today";
  }

  if (diffInDays === -1) {
    return "Yesterday";
  }

  if (diffInDays === 1) {
    return "Tomorrow";
  }

  if (diffInDays < 0) {
    return `${Math.abs(diffInDays)}d ago`;
  }

  return `In ${diffInDays}d`;
};

export const formatCountLabel = (
  count: number,
  singular: string,
  plural = `${singular}s`,
) => {
  return `${count} ${count === 1 ? singular : plural}`;
};

export const formatAverageDays = (value: number | null) => {
  if (value == null) {
    return "No data yet";
  }

  if (value < 1) {
    return "Same day";
  }

  return `${value.toFixed(1)} days`;
};

export const getInitials = (name: string | null | undefined) => {
  if (!name) {
    return "RF";
  }

  const tokens = name
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (tokens.length === 0) {
    return "RF";
  }

  return tokens.map((token) => token[0]?.toUpperCase() ?? "").join("");
};

export const getFirstName = (name: string | null | undefined) => {
  if (!name) {
    return "there";
  }

  return name.split(" ").find(Boolean) ?? name;
};
