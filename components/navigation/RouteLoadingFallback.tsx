import { Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RouteLoadingFallbackProps = {
  cardDescription: string;
  cardTitle: string;
  className?: string;
  description: string;
  kicker: string;
  rows?: number;
  title: string;
};

const RouteLoadingFallback = ({
  cardDescription,
  cardTitle,
  className,
  description,
  kicker,
  rows = 3,
  title,
}: RouteLoadingFallbackProps) => {
  return (
    <section className={cn("space-y-6 px-0 py-1 lg:py-2", className)}>
      <div className="space-y-3">
        <span className="inline-kicker">{kicker}</span>

        <div className="flex items-start gap-3">
          <h1 className="text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
            {title}
          </h1>
          <Loader2 className="mt-1 size-5 shrink-0 animate-spin text-muted-foreground" />
        </div>

        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>{cardTitle}</CardTitle>
          <CardDescription>{cardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: rows }).map((_, index) => (
              <div
                key={index}
                className="h-20 animate-pulse rounded-[1.5rem] border border-border/70 bg-surface-1/75"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export { RouteLoadingFallback };
