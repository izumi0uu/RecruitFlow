import type {
  FollowUpItem,
  FollowUpTodayResponse,
} from "@recruitflow/contracts";
import { ArrowUpRight, Clock3, Sparkles } from "lucide-react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import { formatRelativeDate, humanizeToken } from "@/lib/dashboard/formatters";
import { cn } from "@/lib/utils";

type DailyFollowUpDigestProps = {
  followUps: FollowUpTodayResponse;
};

const reasonClassNames = {
  cadence_due: "border-chart-accent/20 bg-chart-accent/12 text-chart-accent",
  high_risk_without_next_step:
    "border-destructive/25 bg-destructive/10 text-destructive",
  snooze_returned:
    "border-chart-accent/20 bg-chart-accent/12 text-chart-accent",
  submission_stale:
    "border-chart-secondary/20 bg-chart-secondary/12 text-chart-secondary",
  suggested_by_automation:
    "border-chart-primary/20 bg-chart-primary/12 text-chart-primary",
  task_due_today:
    "border-chart-primary/20 bg-chart-primary/12 text-chart-primary",
  task_overdue: "border-destructive/25 bg-destructive/10 text-destructive",
} satisfies Record<FollowUpItem["primaryReason"], string>;

const severityClassNames = {
  critical: "border-destructive/25 bg-destructive/10 text-destructive",
  high: "border-chart-accent/20 bg-chart-accent/12 text-chart-accent",
  low: "border-muted-foreground/20 bg-muted/20 text-muted-foreground",
  normal: "border-chart-primary/20 bg-chart-primary/12 text-chart-primary",
} satisfies Record<FollowUpItem["severity"], string>;

const parseDate = (value: string | null) => (value ? new Date(value) : null);

const getReasonLabel = (reason: FollowUpItem["primaryReason"]) => {
  switch (reason) {
    case "cadence_due":
      return "Cadence due";
    case "high_risk_without_next_step":
      return "Risk needs next step";
    case "snooze_returned":
      return "Snooze returned";
    case "submission_stale":
      return "Submission stale";
    case "suggested_by_automation":
      return "Automation suggestion";
    case "task_due_today":
      return "Due today";
    case "task_overdue":
      return "Overdue task";
  }
};

const getDigestDetail = (item: FollowUpItem) => {
  if (item.nextStep) {
    return item.nextStep;
  }

  if (item.ownerName) {
    return `Owner · ${item.ownerName}`;
  }

  return humanizeToken(item.sourceType);
};

const DailyFollowUpDigest = ({ followUps }: DailyFollowUpDigestProps) => {
  const items = followUps.items.slice(0, 5);

  if (items.length === 0) {
    return (
      <div className="rounded-[1.4rem] border border-dashed border-border/70 bg-workspace-muted-surface/55 px-4 py-5 text-sm leading-6 text-muted-foreground">
        Today’s follow-up loop is clear for this scope. New overdue tasks,
        cadence signals, risk gaps, and reminder suggestions will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.3rem] border border-border/70 bg-workspace-muted-surface/60 px-4 py-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Total signals
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
            {followUps.summary.totalCount}
          </p>
        </div>
        <div className="rounded-[1.3rem] border border-border/70 bg-workspace-muted-surface/60 px-4 py-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Overdue
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
            {followUps.summary.overdueTaskCount}
          </p>
        </div>
        <div className="rounded-[1.3rem] border border-border/70 bg-workspace-muted-surface/60 px-4 py-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Suggestions
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
            {followUps.summary.bySource.reminder_suggestion}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <TrackedLink
            key={item.id}
            href={item.navigationHref}
            className="block rounded-[1.4rem] border border-border/70 bg-workspace-muted-surface/55 px-4 py-4 transition-colors hover:bg-surface-2"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium",
                      severityClassNames[item.severity],
                    )}
                  >
                    {humanizeToken(item.severity)}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium",
                      reasonClassNames[item.primaryReason],
                    )}
                  >
                    {getReasonLabel(item.primaryReason)}
                  </span>
                </div>
                <p className="truncate text-sm font-semibold text-foreground">
                  {item.entityLabel}
                </p>
                <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {getDigestDetail(item)}
                </p>
              </div>
              <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-3.5" />
                {formatRelativeDate(parseDate(item.dueAt))}
              </span>
              <span>
                {item.ownerName ? `Owner · ${item.ownerName}` : "Unassigned"}
              </span>
              {item.sourceType === "reminder_suggestion" ? (
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="size-3.5" />
                  Human approval required
                </span>
              ) : null}
            </div>
          </TrackedLink>
        ))}
      </div>

      {followUps.pagination.totalItems > items.length ? (
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <TrackedLink href="/tasks?view=today">
            Review {followUps.pagination.totalItems - items.length} more
          </TrackedLink>
        </Button>
      ) : null}
    </div>
  );
};

export { DailyFollowUpDigest };
