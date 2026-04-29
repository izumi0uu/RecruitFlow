import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type WorkspacePageHeaderProps = {
  className?: string;
  contentClassName?: string;
  description?: string;
  kicker: string;
  rightSlot?: ReactNode;
  rightSlotClassName?: string;
  title: string;
};

const WorkspacePageHeader = ({
  className,
  contentClassName,
  description,
  kicker,
  rightSlot,
  rightSlotClassName,
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
