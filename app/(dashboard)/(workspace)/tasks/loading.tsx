import { Loader2, Search } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";

const SkeletonLine = ({ className }: { className: string }) => (
  <div className={className} />
);

const TasksLoading = () => (
  <section className="space-y-6 px-0 py-1 lg:py-2">
    <WorkspacePageHeader
      kicker="Execution inbox"
      title="Tasks"
      description="Loading workspace-scoped task context."
      rightSlotClassName="w-full xl:w-auto"
      rightSlot={
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[32rem]">
          {["Mine", "Overdue", "Snoozed", "Done"].map((label) => (
            <div
              key={label}
              className="rounded-[1rem] border border-border/70 bg-workspace-muted-surface/68 px-3 py-2.5"
            >
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {label}
              </p>
              <SkeletonLine className="mt-2 h-6 w-10 animate-pulse rounded-full bg-surface-2" />
            </div>
          ))}
        </div>
      }
    />

    <Card className="rounded-[2.15rem]">
      <CardContent className="space-y-5 pt-1">
        <div className="rounded-[1.65rem] border border-border/70 bg-workspace-muted-surface/48 p-3">
          <div className="mb-3 flex flex-wrap gap-2">
            <SkeletonLine className="h-8 w-28 animate-pulse rounded-full bg-surface-2" />
            <SkeletonLine className="h-8 w-36 animate-pulse rounded-full bg-surface-2" />
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.72fr))_auto]">
            <SkeletonLine className="h-14 animate-pulse rounded-[1.35rem] bg-background/55 lg:col-span-5" />
            <div className="input flex items-center gap-2 text-muted-foreground">
              <Search className="size-4" />
              <span className="text-sm">Loading filters</span>
            </div>
            <SkeletonLine className="h-12 animate-pulse rounded-[1rem] bg-background/55" />
            <SkeletonLine className="h-12 animate-pulse rounded-[1rem] bg-background/55" />
            <SkeletonLine className="h-12 animate-pulse rounded-[1rem] bg-background/55" />
            <SkeletonLine className="h-12 animate-pulse rounded-full bg-background/55" />
          </div>
        </div>

        <div className="grid min-h-[34rem] overflow-hidden rounded-[1.85rem] border border-border/70 bg-background/42 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="grid gap-4 border-t border-border/60 px-4 py-4 first:border-t-0 md:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(9rem,0.22fr)_minmax(10rem,0.24fr)_auto]"
              >
                <div className="flex gap-3">
                  <SkeletonLine className="size-10 shrink-0 animate-pulse rounded-[1rem] bg-surface-2" />
                  <div className="min-w-0 flex-1">
                    <SkeletonLine className="h-5 w-40 animate-pulse rounded-full bg-surface-2" />
                    <SkeletonLine className="mt-4 h-6 w-3/4 animate-pulse rounded-full bg-surface-2" />
                    <SkeletonLine className="mt-3 h-4 w-1/2 animate-pulse rounded-full bg-surface-2" />
                  </div>
                </div>
                <SkeletonLine className="h-16 animate-pulse rounded-[1.15rem] bg-surface-1" />
                <SkeletonLine className="h-16 animate-pulse rounded-[1.15rem] bg-surface-1" />
                <SkeletonLine className="h-10 w-20 animate-pulse rounded-full bg-surface-1" />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center border-t border-border/70 bg-background/30 p-5 lg:border-l lg:border-t-0">
            <div className="text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full border border-border/70 bg-surface-1">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </span>
              <p className="mt-3 text-sm font-medium text-foreground">
                Loading tasks
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </section>
);

export default TasksLoading;
