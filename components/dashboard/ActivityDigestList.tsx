import { ArrowUpRight } from "lucide-react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { formatCompactDateTime } from "@/lib/dashboard/formatters";
import type { DashboardActivityItem } from "@/lib/dashboard/queries";

type ActivityDigestListProps = {
  emptyMessage: string;
  items: DashboardActivityItem[];
};

const ActivityDigestList = ({
  emptyMessage,
  items,
}: ActivityDigestListProps) => {
  if (items.length === 0) {
    return (
      <div className="rounded-[1.35rem] border border-dashed border-border/70 bg-workspace-muted-surface/55 px-4 py-4 text-sm leading-6 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <TrackedLink
          key={item.id}
          href={item.href}
          className="block rounded-[1.35rem] border border-border/70 bg-workspace-muted-surface/55 px-4 py-4 transition-colors hover:bg-surface-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-foreground">{item.actorName}</p>
              <p className="text-sm leading-6 text-muted-foreground">{item.summary}</p>
            </div>
            <ArrowUpRight className="mt-0.5 size-4 text-muted-foreground" />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <span>{item.source}</span>
            <span>{formatCompactDateTime(item.timestamp)}</span>
          </div>
        </TrackedLink>
      ))}
    </div>
  );
};

export { ActivityDigestList };
