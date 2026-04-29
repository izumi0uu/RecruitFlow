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

type DashboardHeroMetricTileProps = {
  href: string;
  icon: ReactNode;
  label: string;
  value: string;
};

const DashboardHeroMetricTile = ({
  href,
  icon,
  label,
  value,
}: DashboardHeroMetricTileProps) => {
  return (
    <TrackedLink
      href={href}
      className="group rounded-[1.2rem] border border-border/70 bg-workspace-muted-surface/72 p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-surface-2 hover:shadow-[0_20px_48px_-38px_var(--shadow-color)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex size-8 items-center justify-center rounded-[0.85rem] border border-border/70 bg-background/75 text-foreground">
          {icon}
        </span>
        <ArrowUpRight className="size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
      <p className="mt-3 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-foreground">
        {value}
      </p>
    </TrackedLink>
  );
};

export { DashboardHeroMetricTile, DashboardMetricPill, DashboardStatCard };
