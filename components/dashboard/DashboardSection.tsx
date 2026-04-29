import type { ReactNode } from "react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type DashboardSectionProps = {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  description?: string;
  eyebrow?: string;
  title: string;
};

const DashboardSection = ({
  action,
  children,
  className,
  contentClassName,
  description,
  eyebrow,
  title,
}: DashboardSectionProps) => {
  return (
    <Card className={cn("h-full rounded-[1.85rem]", className)}>
      <CardHeader>
        {action ? <CardAction>{action}</CardAction> : null}
        {eyebrow ? (
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {eyebrow}
          </span>
        ) : null}
        <CardTitle className="text-lg tracking-[-0.03em]">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className={cn("space-y-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
};

export { DashboardSection };
