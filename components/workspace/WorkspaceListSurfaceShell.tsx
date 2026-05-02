"use client";

import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Filter } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type WorkspaceListPagination = {
  currentPage: number;
  disabled?: boolean;
  onNext: () => void;
  onPrevious: () => void;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

type WorkspaceListFooterNote = {
  children: ReactNode;
  icon: ReactNode;
  title?: ReactNode;
};

type WorkspaceListSurfaceShellProps = {
  alerts?: ReactNode;
  children: ReactNode;
  contentHeader?: ReactNode;
  contentHeaderClassName?: string;
  filterBadges: ReactNode;
  filterControls: ReactNode;
  filterControlsClassName?: string;
  footerNote?: WorkspaceListFooterNote;
  pagination: WorkspaceListPagination;
};

const WorkspaceListStatusBadge = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "status-message border-border/70 bg-surface-1/70 text-muted-foreground",
      className,
    )}
  >
    {children}
  </span>
);

const WorkspaceListPaginationFooter = ({
  currentPage,
  disabled = false,
  onNext,
  onPrevious,
  pageSize,
  totalItems,
  totalPages,
}: WorkspaceListPagination) => (
  <div className="flex flex-col gap-3 rounded-[1.45rem] border border-border/70 bg-background/35 px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
    <div className="flex flex-wrap items-center gap-2">
      <Filter className="size-4" />
      <span>
        Page {currentPage} of {totalPages}
      </span>
      <span className="text-muted-foreground/60">·</span>
      <span>{pageSize} per page</span>
      <span className="text-muted-foreground/60">·</span>
      <span>{totalItems} total</span>
    </div>

    <div className="flex items-center gap-2">
      <Button
        className="rounded-full"
        type="button"
        variant="outline"
        disabled={disabled || currentPage <= 1}
        onClick={onPrevious}
      >
        <ArrowLeft className="size-4" />
        Previous
      </Button>
      <Button
        className="rounded-full"
        type="button"
        variant="outline"
        disabled={disabled || currentPage >= totalPages}
        onClick={onNext}
      >
        Next
        <ArrowRight className="size-4" />
      </Button>
    </div>
  </div>
);

const WorkspaceListFooterNote = ({
  children,
  icon,
  title,
}: WorkspaceListFooterNote) => (
  <div className="flex items-start gap-3 rounded-[1.45rem] border border-border/70 bg-workspace-muted-surface/45 px-4 py-4">
    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[1rem] border border-border/70 bg-background/70">
      {icon}
    </span>
    {title ? (
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {children}
        </p>
      </div>
    ) : (
      <p className="text-sm leading-6 text-muted-foreground">{children}</p>
    )}
  </div>
);

const WorkspaceListSurfaceShell = ({
  alerts,
  children,
  contentHeader,
  contentHeaderClassName,
  filterBadges,
  filterControls,
  filterControlsClassName,
  footerNote,
  pagination,
}: WorkspaceListSurfaceShellProps) => (
  <Card className="rounded-[2.15rem]">
    <CardContent className="space-y-5 pt-1">
      <div className="rounded-[1.65rem] border border-border/70 bg-workspace-muted-surface/48 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
        <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
          {filterBadges}
        </div>

        <div
          className={cn("grid gap-3 lg:items-end", filterControlsClassName)}
        >
          {filterControls}
        </div>
      </div>

      {alerts}

      <div className="overflow-hidden rounded-[1.85rem] border border-border/70 bg-background/42 shadow-[0_24px_70px_-54px_var(--shadow-color)]">
        {contentHeader ? (
          <div
            className={cn(
              "hidden gap-4 bg-workspace-muted-surface/62 px-5 py-3 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground lg:grid",
              contentHeaderClassName,
            )}
          >
            {contentHeader}
          </div>
        ) : null}

        {children}
      </div>

      <WorkspaceListPaginationFooter {...pagination} />

      {footerNote ? <WorkspaceListFooterNote {...footerNote} /> : null}
    </CardContent>
  </Card>
);

export {
  WorkspaceListPaginationFooter,
  WorkspaceListStatusBadge,
  WorkspaceListSurfaceShell,
};
