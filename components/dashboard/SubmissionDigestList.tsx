import { ArrowUpRight, Clock3 } from "lucide-react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { cn } from "@/lib/utils";
import {
  formatRelativeDate,
  formatRiskLabel,
  formatStageLabel,
} from "@/lib/dashboard/formatters";
import type { DashboardSubmissionDigestItem } from "@/lib/dashboard/queries";

type SubmissionDigestListProps = {
  emptyMessage: string;
  items: DashboardSubmissionDigestItem[];
};

const riskClassNames = {
  feedback_risk:
    "border-chart-secondary/20 bg-chart-secondary/12 text-chart-secondary",
  fit_risk: "border-chart-strong/20 bg-chart-strong/12 text-chart-strong",
  none: "border-success/20 bg-success/10 text-success",
  timing_risk: "border-chart-accent/20 bg-chart-accent/12 text-chart-accent",
  compensation_risk:
    "border-chart-primary/20 bg-chart-primary/12 text-chart-primary",
} as const;

const SubmissionDigestList = ({
  emptyMessage,
  items,
}: SubmissionDigestListProps) => {
  if (items.length === 0) {
    return (
      <div className="rounded-[1.4rem] border border-dashed border-border/70 bg-workspace-muted-surface/55 px-4 py-5 text-sm leading-6 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <TrackedLink
          key={item.id}
          href="/pipeline"
          className="block rounded-[1.4rem] border border-border/70 bg-workspace-muted-surface/55 px-4 py-4 transition-colors hover:bg-surface-2"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {item.candidateName}
                </p>
                <span className="text-sm text-muted-foreground">•</span>
                <p className="text-sm text-muted-foreground">{item.jobTitle}</p>
              </div>
              <p className="text-sm text-muted-foreground">{item.clientName}</p>
            </div>
            <ArrowUpRight className="mt-0.5 size-4 text-muted-foreground" />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              {formatStageLabel(item.stage)}
            </span>
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                riskClassNames[item.riskFlag],
              )}
            >
              {formatRiskLabel(item.riskFlag)}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>{item.ownerName ? `Owner · ${item.ownerName}` : "Unassigned"}</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5" />
              {formatRelativeDate(item.lastTouchAt)}
            </span>
          </div>

          {item.nextStep ? (
            <p className="mt-3 text-sm leading-6 text-foreground/88">
              {item.nextStep}
            </p>
          ) : null}
        </TrackedLink>
      ))}
    </div>
  );
};

export { SubmissionDigestList };
