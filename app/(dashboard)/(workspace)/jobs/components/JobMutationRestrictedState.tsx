import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

type JobMutationRestrictedStateProps = {
  backHref?: string;
  backLabel?: string;
  description?: string;
  title?: string;
};

export const JobMutationRestrictedState = ({
  backHref = "/jobs",
  backLabel = "Back to jobs",
  description = "Coordinators can inspect job intake records, but owners and recruiters own job creation, edit, status, priority, and stage-template repair actions.",
  title = "Restricted job action",
}: JobMutationRestrictedStateProps) => (
  <Card className="max-w-5xl">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>
        The visible page state now matches the API permission boundary.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-5">
      <div className="rounded-[1.5rem] border border-border/70 bg-surface-1/75 p-5">
        <p className="text-sm font-medium text-foreground">
          Only owners and recruiters can save job intake changes.
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <Button asChild variant="outline" className="rounded-full">
        <TrackedLink href={backHref}>{backLabel}</TrackedLink>
      </Button>
    </CardContent>
  </Card>
);
