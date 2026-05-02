"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";

type WorkspacePageHeaderSummaryProps = {
  actionDisabled?: boolean;
  actionHref?: string;
  actionLabel: string;
  onAction?: () => void;
  role: string;
  totalItems: number | string;
  visibleItems: number | string;
};

const WorkspaceHeaderMetric = ({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) => (
  <div className="min-w-0 rounded-[1rem] border border-border/70 bg-workspace-muted-surface/68 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:min-w-[6.8rem]">
    <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {label}
    </p>
    <p className="mt-1.5 text-xl font-semibold tracking-[-0.05em] text-foreground">
      {value}
    </p>
  </div>
);

const WorkspacePageHeaderSummary = ({
  actionDisabled = false,
  actionHref,
  actionLabel,
  onAction,
  role,
  totalItems,
  visibleItems,
}: WorkspacePageHeaderSummaryProps) => {
  const actionContent = (
    <>
      <Plus className="size-4" />
      {actionLabel}
    </>
  );

  return (
    <div className="flex w-full flex-col gap-3">
      {actionHref && !actionDisabled ? (
        <Button asChild className="w-full justify-center rounded-full">
          <TrackedLink href={actionHref}>{actionContent}</TrackedLink>
        </Button>
      ) : (
        <Button
          className="w-full justify-center rounded-full"
          disabled={actionDisabled}
          type="button"
          onClick={onAction}
        >
          {actionContent}
        </Button>
      )}

      <div className="grid w-full grid-cols-3 gap-2">
        <WorkspaceHeaderMetric label="Visible" value={visibleItems} />
        <WorkspaceHeaderMetric label="Total" value={totalItems} />
        <WorkspaceHeaderMetric label="Role" value={role} />
      </div>
    </div>
  );
};

export { WorkspacePageHeaderSummary };
