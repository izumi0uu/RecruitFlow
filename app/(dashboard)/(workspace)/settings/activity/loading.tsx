import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

const ActivityPageSkeleton = () => {
  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <div className="space-y-3">
        <span className="inline-kicker">Activity</span>
        <h1 className="text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
          Activity log
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Loading your most recent account and workspace activity.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Syncing the latest actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-20 rounded-[1.5rem] border border-border/70 bg-surface-1/75"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default ActivityPageSkeleton;
