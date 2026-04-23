import type { ReactNode } from "react";

import { ArrowUpRight } from "lucide-react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type DashboardStatCardProps = {
  detail: string;
  href: string;
  icon: ReactNode;
  title: string;
  value: string;
};

const DashboardStatCard = ({
  detail,
  href,
  icon,
  title,
  value,
}: DashboardStatCardProps) => {
  return (
    <Card className="rounded-[1.65rem]">
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-11 items-center justify-center rounded-[1.1rem] border border-border/70 bg-workspace-muted-surface text-foreground">
            {icon}
          </span>
          <TrackedLink
            href={href}
            className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/75 px-2.5 py-1 text-[0.72rem] font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            Open
            <ArrowUpRight className="size-3" />
          </TrackedLink>
        </div>
        <div className="space-y-2">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {title}
          </p>
          <p className="text-3xl font-semibold tracking-[-0.05em] text-foreground">
            {value}
          </p>
          <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
};

type DashboardMetricPillProps = {
  children: ReactNode;
  className?: string;
};

const DashboardMetricPill = ({
  children,
  className,
}: DashboardMetricPillProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border/70 bg-workspace-muted-surface px-3 py-1 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
};

export { DashboardMetricPill, DashboardStatCard };
