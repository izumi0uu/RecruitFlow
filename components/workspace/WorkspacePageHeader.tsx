import type { ReactNode } from "react";

import {
  type WorkspaceBreadcrumbItem,
  WorkspacePageHeaderNavigation,
} from "@/components/workspace/WorkspacePageHeaderNavigation";
import { cn } from "@/lib/utils";

type WorkspacePageHeaderProps = {
  backDisabled?: boolean;
  backHref?: string;
  backLabel?: string;
  breadcrumbItems?: WorkspaceBreadcrumbItem[];
  className?: string;
  contentClassName?: string;
  description?: string;
  kicker: string;
  navigationClassName?: string;
  rightSlot?: ReactNode;
  rightSlotClassName?: string;
  showBackButton?: boolean;
  title: string;
};

const WorkspacePageHeader = ({
  backDisabled,
  backHref,
  backLabel,
  breadcrumbItems,
  className,
  contentClassName,
  description,
  kicker,
  navigationClassName,
  rightSlot,
  rightSlotClassName,
  showBackButton,
  title,
}: WorkspacePageHeaderProps) => {
  return (
    <div
      className={cn(
        "grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start",
        className,
      )}
    >
      <div className={cn("space-y-3", contentClassName)}>
        <WorkspacePageHeaderNavigation
          backDisabled={backDisabled}
          backHref={backHref}
          backLabel={backLabel}
          breadcrumbItems={breadcrumbItems}
          className={navigationClassName}
          showBackButton={showBackButton}
        />
        <span className="inline-kicker">{kicker}</span>
        <h1 className="text-balance text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>

      {rightSlot ? (
        <div
          className={cn(
            "flex justify-start xl:justify-end",
            rightSlotClassName,
          )}
        >
          {rightSlot}
        </div>
      ) : null}
    </div>
  );
};

export { WorkspacePageHeader };
