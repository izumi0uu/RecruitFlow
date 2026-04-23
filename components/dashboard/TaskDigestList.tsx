import { Clock3 } from "lucide-react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { cn } from "@/lib/utils";
import {
  formatRelativeDate,
  formatTaskStatusLabel,
} from "@/lib/dashboard/formatters";
import type { DashboardTaskDigestItem } from "@/lib/dashboard/queries";

type TaskDigestListProps = {
  emptyMessage: string;
  items: DashboardTaskDigestItem[];
  routeHref?: string;
};

const statusClassNames = {
  done: "border-success/20 bg-success/10 text-success",
  open: "border-chart-primary/20 bg-chart-primary/12 text-chart-primary",
  snoozed: "border-chart-accent/20 bg-chart-accent/12 text-chart-accent",
} as const;

const TaskDigestList = ({
  emptyMessage,
  items,
  routeHref = "/tasks",
}: TaskDigestListProps) => {
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
          href={routeHref}
          className="block rounded-[1.4rem] border border-border/70 bg-workspace-muted-surface/55 px-4 py-4 transition-colors hover:bg-surface-2"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              <p className="text-sm leading-6 text-muted-foreground">
                {item.candidateName && item.jobTitle
                  ? `${item.candidateName} · ${item.jobTitle}`
                  : item.jobTitle
                    ? item.jobTitle
                    : "Workspace follow-up"}
              </p>
            </div>
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                statusClassNames[item.status],
              )}
            >
              {formatTaskStatusLabel(item.status)}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5" />
              {formatRelativeDate(item.dueAt)}
            </span>
            <span>
              {item.assigneeName ? `Assignee · ${item.assigneeName}` : "Unassigned"}
            </span>
          </div>
        </TrackedLink>
      ))}
    </div>
  );
};

export { TaskDigestList };
