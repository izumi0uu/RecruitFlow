import type { ComponentProps } from "react";

import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const SkeletonBlock = ({
  className,
  ...props
}: ComponentProps<"div">) => (
  <div
    aria-hidden="true"
    className={cn("animate-pulse rounded-full bg-surface-2/80", className)}
    {...props}
  />
);

const SkeletonLine = ({ className }: { className?: string }) => (
  <SkeletonBlock className={cn("h-3", className)} />
);

const DashboardSkeletonCard = ({
  children,
  className,
}: ComponentProps<"div">) => (
  <Card className={cn("h-full rounded-[1.85rem]", className)}>{children}</Card>
);

const SkeletonSectionHeader = ({
  action = false,
  description = true,
}: {
  action?: boolean;
  description?: boolean;
}) => (
  <header className="grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6">
    {action ? (
      <div className="col-start-2 row-span-2 row-start-1 h-8 w-24 justify-self-end rounded-full border border-border/70 bg-workspace-muted-surface/80" />
    ) : null}
    <SkeletonBlock className="h-3 w-20" />
    <SkeletonBlock className="h-5 w-44 rounded-[0.8rem]" />
    {description ? <SkeletonLine className="w-[min(23rem,74%)]" /> : null}
  </header>
);

const MetricTileSkeleton = () => (
  <div className="rounded-[1.2rem] border border-border/70 bg-workspace-muted-surface/72 p-3">
    <div className="flex items-start justify-between gap-3">
      <SkeletonBlock className="size-9 rounded-[0.95rem]" />
      <SkeletonBlock className="size-6 rounded-full" />
    </div>
    <SkeletonBlock className="mt-7 h-8 w-16 rounded-[0.9rem]" />
    <SkeletonLine className="mt-3 w-28" />
  </div>
);

const TaskTableSkeleton = () => (
  <div className="overflow-hidden rounded-[1.45rem] border border-border/70 bg-background/35">
    <div className="hidden grid-cols-[36px_46px_minmax(220px,1.25fr)_minmax(150px,0.9fr)_100px_110px_minmax(110px,0.7fr)_126px] items-center gap-4 bg-workspace-muted-surface/65 px-4 py-3 xl:grid">
      {Array.from({ length: 8 }).map((_, index) => (
        <SkeletonLine key={index} className="h-2.5 w-full" />
      ))}
    </div>
    <div className="divide-y divide-border/60">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="grid gap-4 px-4 py-4 xl:grid-cols-[36px_46px_minmax(220px,1.25fr)_minmax(150px,0.9fr)_100px_110px_minmax(110px,0.7fr)_126px] xl:items-center"
        >
          <SkeletonBlock className="size-5 rounded-full" />
          <SkeletonLine className="w-7" />
          <div className="space-y-2">
            <SkeletonLine className="h-3.5 w-[82%]" />
            <SkeletonLine className="w-[58%]" />
          </div>
          <SkeletonLine className="w-[72%]" />
          <SkeletonLine className="w-16" />
          <SkeletonBlock className="h-7 w-20 rounded-full" />
          <SkeletonLine className="w-20" />
          <SkeletonBlock className="h-9 w-28 rounded-[0.95rem]" />
        </div>
      ))}
    </div>
  </div>
);

const AreaChartSkeleton = () => (
  <div className="overflow-hidden rounded-[1.4rem] border border-border/70 bg-workspace-muted-surface/60 p-3">
    <div className="relative h-[210px] overflow-hidden rounded-[1.1rem] bg-background/40">
      <div className="absolute inset-x-4 bottom-8 top-6 grid grid-rows-4 gap-8">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="border-t border-border/55" />
        ))}
      </div>
      <div className="absolute bottom-10 left-5 right-5 flex items-end gap-3">
        {[32, 48, 40, 64, 56, 76, 62, 88, 70].map((height, index) => (
          <SkeletonBlock
            key={index}
            className="flex-1 rounded-t-full rounded-b-[0.45rem]"
            style={{ height }}
          />
        ))}
      </div>
      <SkeletonBlock className="absolute left-5 top-5 h-3 w-28" />
      <SkeletonBlock className="absolute right-5 top-5 h-3 w-20" />
    </div>
  </div>
);

const RingSkeleton = () => (
  <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-center">
    <div className="mx-auto flex size-[220px] items-center justify-center rounded-full border border-border/70 bg-workspace-muted-surface">
      <div className="flex size-[148px] items-center justify-center rounded-full border border-border/70 bg-background/70">
        <div className="space-y-2 text-center">
          <SkeletonLine className="mx-auto w-16" />
          <SkeletonBlock className="mx-auto h-7 w-20 rounded-[0.9rem]" />
        </div>
      </div>
    </div>
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-border/70 bg-workspace-muted-surface/70 px-3 py-3"
        >
          <div className="flex items-center gap-3">
            <SkeletonBlock className="size-2.5 rounded-full" />
            <SkeletonLine className="w-28" />
          </div>
          <SkeletonLine className="w-8" />
        </div>
      ))}
    </div>
  </div>
);

const BarChartSkeleton = () => (
  <div className="flex min-h-[25rem] flex-1 items-end gap-4 rounded-[1.4rem] border border-border/70 bg-workspace-muted-surface/60 p-4">
    {[72, 48, 88, 62, 76, 54, 38].map((height, index) => (
      <div key={index} className="flex min-w-0 flex-1 flex-col items-center gap-3">
        <SkeletonBlock
          className="w-full rounded-t-[1rem] rounded-b-[0.5rem]"
          style={{ height: `${height}%` }}
        />
        <SkeletonLine className="w-10" />
      </div>
    ))}
  </div>
);

const DigestListSkeleton = ({ rows = 3 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, index) => (
      <div
        key={index}
        className="rounded-[1.4rem] border border-border/70 bg-workspace-muted-surface/55 px-4 py-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="w-full space-y-2">
            <SkeletonLine className="h-3.5 w-[62%]" />
            <SkeletonLine className="w-[82%]" />
          </div>
          <SkeletonBlock className="h-7 w-20 shrink-0 rounded-full" />
        </div>
        <SkeletonLine className="mt-4 w-[45%]" />
      </div>
    ))}
  </div>
);

const DashboardLoading = () => {
  return (
    <section
      aria-busy="true"
      aria-label="Loading dashboard"
      className="space-y-6 px-0 py-1 lg:py-2"
    >
      <Card className="rounded-[2.1rem]">
        <CardContent className="grid gap-6 pt-1 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.48fr)] xl:items-stretch">
          <div className="flex min-h-[18rem] flex-col justify-between gap-6">
            <div className="space-y-4">
              <span className="inline-kicker">Dashboard</span>
              <div className="space-y-3">
                <SkeletonBlock className="h-11 w-[min(28rem,86%)] rounded-[1rem]" />
                <div className="max-w-3xl space-y-2">
                  <SkeletonLine className="w-full" />
                  <SkeletonLine className="w-[72%]" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SkeletonBlock className="h-7 w-36" />
                <SkeletonBlock className="h-7 w-28" />
                <SkeletonBlock className="h-7 w-40" />
              </div>
            </div>

            <div className="flex flex-col items-start gap-3">
              <SkeletonBlock className="h-9 w-44" />
              <div className="flex flex-wrap gap-2">
                <SkeletonBlock className="h-10 w-32" />
                <SkeletonBlock className="h-10 w-28" />
              </div>
            </div>
          </div>

          <div className="rounded-[1.7rem] border border-border/70 bg-background/46 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <div className="grid gap-3 sm:grid-cols-2 xl:h-full">
              {Array.from({ length: 4 }).map((_, index) => (
                <MetricTileSkeleton key={index} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <DashboardSkeletonCard>
        <SkeletonSectionHeader action />
        <CardContent className="space-y-4">
          <TaskTableSkeleton />
        </CardContent>
      </DashboardSkeletonCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] xl:items-stretch">
        <div className="grid gap-6">
          <DashboardSkeletonCard className="h-auto self-start">
            <SkeletonSectionHeader action />
            <CardContent className="space-y-4">
              <AreaChartSkeleton />
            </CardContent>
          </DashboardSkeletonCard>

          <DashboardSkeletonCard>
            <SkeletonSectionHeader />
            <CardContent className="space-y-4">
              <RingSkeleton />
            </CardContent>
          </DashboardSkeletonCard>
        </div>

        <DashboardSkeletonCard>
          <SkeletonSectionHeader />
          <CardContent className="flex flex-1 min-h-0">
            <BarChartSkeleton />
          </CardContent>
        </DashboardSkeletonCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardSkeletonCard>
          <SkeletonSectionHeader />
          <CardContent className="space-y-4">
            <DigestListSkeleton />
          </CardContent>
        </DashboardSkeletonCard>

        <DashboardSkeletonCard>
          <SkeletonSectionHeader />
          <CardContent className="space-y-4">
            <DigestListSkeleton />
          </CardContent>
        </DashboardSkeletonCard>
      </div>

      <DashboardSkeletonCard>
        <SkeletonSectionHeader action />
        <CardContent className="space-y-4">
          <DigestListSkeleton rows={2} />
        </CardContent>
      </DashboardSkeletonCard>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_minmax(0,1.15fr)]">
        <DashboardSkeletonCard>
          <SkeletonSectionHeader />
          <CardContent className="space-y-4">
            <div className="rounded-[1.5rem] border border-border/70 bg-workspace-muted-surface/70 px-4 py-5">
              <SkeletonLine className="w-28" />
              <SkeletonBlock className="mt-3 h-9 w-24 rounded-[1rem]" />
              <SkeletonLine className="mt-3 w-[82%]" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.35rem] border border-border/70 bg-workspace-muted-surface/55 px-4 py-4">
                <SkeletonLine className="w-24" />
                <SkeletonBlock className="mt-3 h-7 w-16 rounded-[0.85rem]" />
              </div>
              <div className="rounded-[1.35rem] border border-border/70 bg-workspace-muted-surface/55 px-4 py-4">
                <SkeletonLine className="w-28" />
                <SkeletonLine className="mt-3 w-full" />
                <SkeletonLine className="mt-2 w-[64%]" />
              </div>
            </div>
          </CardContent>
        </DashboardSkeletonCard>

        <DashboardSkeletonCard>
          <SkeletonSectionHeader />
          <CardContent className="space-y-4">
            <DigestListSkeleton rows={2} />
          </CardContent>
        </DashboardSkeletonCard>
      </div>
    </section>
  );
};

export default DashboardLoading;
