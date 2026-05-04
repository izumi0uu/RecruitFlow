import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const boardLaneSkeletonKeys = [
  "sourced",
  "screening",
  "submitted",
  "client-interview",
  "offer",
  "placed",
  "lost",
] as const;
const cardSkeletonKeys = ["primary", "secondary"] as const;
const metricSkeletonKeys = [
  "active",
  "attention",
  "client-facing",
  "outcomes",
] as const;

const SkeletonBlock = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    aria-hidden="true"
    className={cn("animate-pulse rounded-full bg-surface-2/80", className)}
    {...props}
  />
);

const SkeletonLine = ({ className }: { className?: string }) => (
  <SkeletonBlock className={cn("h-3", className)} />
);

const MetricSkeleton = () => (
  <div className="rounded-[1.05rem] border border-border/70 bg-workspace-muted-surface/62 px-4 py-4">
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-3">
        <SkeletonLine className="w-20" />
        <SkeletonBlock className="h-8 w-14 rounded-[0.8rem]" />
      </div>
      <SkeletonBlock className="size-2.5" />
    </div>
    <SkeletonLine className="mt-4 w-[72%]" />
  </div>
);

const StageRailSkeleton = () => (
  <div className="overflow-x-auto pb-1">
    <div className="grid min-w-[68rem] grid-cols-7 gap-2">
      {boardLaneSkeletonKeys.map((stageKey) => (
        <div
          key={stageKey}
          className="rounded-[1.15rem] border border-border/70 bg-background/58 px-3 py-3"
        >
          <div className="flex items-center justify-between gap-3">
            <SkeletonLine className="w-8" />
            <SkeletonBlock className="size-3.5" />
          </div>
          <div className="mt-5 flex items-end justify-between gap-3">
            <div className="w-full space-y-2">
              <SkeletonLine className="w-[72%]" />
              <SkeletonLine className="w-[58%]" />
            </div>
            <SkeletonBlock className="h-7 w-8 rounded-[0.75rem]" />
          </div>
          <SkeletonBlock className="mt-4 h-1.5 w-full" />
          <SkeletonLine className="mt-3 w-[64%]" />
        </div>
      ))}
    </div>
  </div>
);

const BoardLaneSkeleton = () => (
  <section className="flex min-h-[26rem] flex-col rounded-[1.25rem] border border-border/70 bg-workspace-muted-surface/45 p-3">
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-2">
        <SkeletonLine className="w-24" />
        <SkeletonLine className="w-32" />
      </div>
      <SkeletonBlock className="h-6 w-8" />
    </div>
    <div className="mt-3 space-y-3">
      {cardSkeletonKeys.map((cardKey) => (
        <div
          key={cardKey}
          className="rounded-[1.1rem] border border-border/70 bg-background/76 p-3.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="w-full space-y-2">
              <SkeletonLine className="w-[72%]" />
              <SkeletonLine className="w-[56%]" />
            </div>
            <SkeletonBlock className="h-7 w-16" />
          </div>
          <div className="mt-4 rounded-[0.9rem] border border-border/60 bg-surface-1/62 px-3 py-3">
            <SkeletonLine className="w-[78%]" />
            <SkeletonLine className="mt-2 w-[46%]" />
          </div>
          <SkeletonBlock className="mt-4 h-16 w-full rounded-[0.95rem]" />
          <div className="mt-3 flex gap-2">
            <SkeletonLine className="w-20" />
            <SkeletonLine className="w-16" />
          </div>
        </div>
      ))}
    </div>
  </section>
);

const PipelineLoading = () => (
  <section
    aria-busy="true"
    aria-label="Loading pipeline"
    className="space-y-6 px-0 py-1 lg:py-2"
  >
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
      <div className="space-y-3">
        <span className="inline-kicker">Opportunity pipeline</span>
        <SkeletonBlock className="h-10 w-48 rounded-[1rem]" />
        <div className="max-w-2xl space-y-2">
          <SkeletonLine className="w-full" />
          <SkeletonLine className="w-[72%]" />
        </div>
      </div>
      <div className="flex w-full flex-col gap-3">
        <SkeletonBlock className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-2">
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-10 w-full" />
        </div>
      </div>
    </div>

    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {metricSkeletonKeys.map((metricKey) => (
        <MetricSkeleton key={metricKey} />
      ))}
    </div>

    <div className="rounded-[1.65rem] border border-border/70 bg-background/45 p-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-[1.25rem] border border-border/70 bg-workspace-muted-surface/48 p-4">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <SkeletonLine className="w-24" />
              <SkeletonLine className="w-72 max-w-full" />
            </div>
            <SkeletonBlock className="h-8 w-36" />
          </div>
          <StageRailSkeleton />
        </div>
        <div className="rounded-[1.2rem] border border-border/70 bg-background/62 p-4">
          <div className="flex items-start gap-3">
            <SkeletonBlock className="size-10 rounded-[1rem]" />
            <div className="w-full space-y-2">
              <SkeletonLine className="w-28" />
              <SkeletonBlock className="h-6 w-[72%] rounded-[0.8rem]" />
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            <SkeletonBlock className="h-20 w-full rounded-[1rem]" />
            <SkeletonBlock className="h-20 w-full rounded-[1rem]" />
          </div>
        </div>
      </div>
    </div>

    <div className="rounded-[1.65rem] border border-border/70 bg-background/45 p-3">
      <div className="rounded-[1.2rem] border border-border/70 bg-workspace-muted-surface/48 px-4 py-4">
        <SkeletonLine className="w-24" />
        <SkeletonLine className="mt-2 w-80 max-w-full" />
      </div>
      <div className="mt-3 overflow-x-auto pb-2">
        <div className="grid min-w-[80rem] grid-cols-7 gap-3">
          {boardLaneSkeletonKeys.map((stageKey) => (
            <BoardLaneSkeleton key={stageKey} />
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default PipelineLoading;
