import { Check, Clock3 } from "lucide-react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import {
  formatRelativeDate,
  formatTaskStatusLabel,
} from "@/lib/dashboard/formatters";
import type { DashboardTaskDigestItem } from "@/lib/dashboard/queries";
import { cn } from "@/lib/utils";

type TaskTodoTableProps = {
  emptyMessage: string;
  items: DashboardTaskDigestItem[];
  routeHref?: string;
};

const statusClassNames = {
  done: "border-success/20 bg-success/10 text-success",
  open: "border-chart-primary/20 bg-chart-primary/12 text-chart-primary",
  snoozed: "border-chart-accent/20 bg-chart-accent/12 text-chart-accent",
} as const;

const statusMarkerClassNames = {
  done: "border-success/20 bg-success/12 text-success",
  open: "border-chart-primary/20 bg-chart-primary/12 text-chart-primary",
  snoozed: "border-chart-accent/20 bg-chart-accent/12 text-chart-accent",
} as const;

const getTaskContext = (item: DashboardTaskDigestItem) => {
  if (item.candidateName && item.jobTitle) {
    return `${item.candidateName} · ${item.jobTitle}`;
  }

  return item.jobTitle ?? "Workspace follow-up";
};

const TaskTodoTable = ({
  emptyMessage,
  items,
  routeHref = "/tasks",
}: TaskTodoTableProps) => {
  if (items.length === 0) {
    return (
      <div className="rounded-[1.35rem] border border-dashed border-border/70 bg-workspace-muted-surface/55 px-4 py-6 text-sm leading-6 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.55rem] border border-border/70 bg-background/50">
      <div className="hidden grid-cols-[36px_46px_minmax(220px,1.25fr)_minmax(150px,0.9fr)_100px_110px_minmax(110px,0.7fr)_126px] items-center gap-4 bg-workspace-muted-surface/65 px-4 py-3 text-sm font-medium text-muted-foreground xl:grid">
        <span
          className="size-4 rounded-[0.35rem] border border-muted-foreground/45"
          aria-hidden
        />
        <span>No</span>
        <span>Task</span>
        <span>Context</span>
        <span>Due</span>
        <span>Status</span>
        <span>Owner</span>
        <span className="text-right">Action</span>
      </div>

      <div className="divide-y divide-border/60">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="grid gap-4 px-4 py-4 transition-colors hover:bg-workspace-muted-surface/45 xl:grid-cols-[36px_46px_minmax(220px,1.25fr)_minmax(150px,0.9fr)_100px_110px_minmax(110px,0.7fr)_126px] xl:items-center"
          >
            <div className="hidden xl:block">
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-[0.45rem] border",
                  statusMarkerClassNames[item.status],
                )}
                aria-hidden
              >
                {item.status === "done" ? <Check className="size-3" /> : null}
              </span>
            </div>

            <div className="hidden text-sm text-muted-foreground xl:block">
              {String(index + 1).padStart(2, "0")}
            </div>

            <div className="min-w-0">
              <div className="flex items-start gap-3 xl:hidden">
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[0.45rem] border",
                    statusMarkerClassNames[item.status],
                  )}
                  aria-hidden
                >
                  {item.status === "done" ? <Check className="size-3" /> : null}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {getTaskContext(item)}
                  </p>
                </div>
              </div>

              <div className="hidden xl:block">
                <p className="truncate text-sm font-semibold text-foreground">
                  {item.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Daily recruiting work
                </p>
              </div>
            </div>

            <div className="hidden min-w-0 text-sm leading-6 text-muted-foreground xl:block">
              <span className="line-clamp-2">{getTaskContext(item)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground xl:block">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-3.5" />
                {formatRelativeDate(item.dueAt)}
              </span>
              <span className="xl:hidden">
                {item.assigneeName ? item.assigneeName : "Unassigned"}
              </span>
            </div>

            <div>
              <span
                className={cn(
                  "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
                  statusClassNames[item.status],
                )}
              >
                {formatTaskStatusLabel(item.status)}
              </span>
            </div>

            <div className="hidden truncate text-sm text-muted-foreground xl:block">
              {item.assigneeName ?? "Unassigned"}
            </div>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 w-full rounded-[0.85rem] px-3 xl:justify-self-end"
            >
              <TrackedLink href={routeHref}>Review task</TrackedLink>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export { TaskTodoTable };
