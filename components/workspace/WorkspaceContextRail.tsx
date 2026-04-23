import { ArrowRight, BriefcaseBusiness, LayoutDashboard, SquareKanban, Workflow } from "lucide-react";

import { ActivityDigestList } from "@/components/dashboard/ActivityDigestList";
import { DashboardMetricPill } from "@/components/dashboard/DashboardStatCard";
import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { formatRoleLabel, getInitials } from "@/lib/dashboard/formatters";
import type { DashboardActivityItem, DashboardKpis } from "@/lib/dashboard/queries";
import type { WorkspaceRole } from "@/lib/db/schema";

type WorkspaceContextRailProps = {
  activity: DashboardActivityItem[];
  email: string;
  kpis: DashboardKpis | null;
  name: string | null;
  role: WorkspaceRole;
  workspaceName: string;
};

const WorkspaceContextRail = ({
  activity,
  email,
  kpis,
  name,
  role,
  workspaceName,
}: WorkspaceContextRailProps) => {
  return (
    <div className="space-y-4">
      <Card className="workspace-rail rounded-[2rem]">
        <CardContent className="space-y-5 pt-1">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback>{getInitials(name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">
                {name ?? "RecruitFlow user"}
              </p>
              <p className="truncate text-sm text-muted-foreground">{email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DashboardMetricPill>{formatRoleLabel(role)}</DashboardMetricPill>
            <DashboardMetricPill>{workspaceName}</DashboardMetricPill>
          </div>

          {kpis ? (
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="rounded-[1.35rem] border border-border/70 bg-workspace-muted-surface/70 px-4 py-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Open Jobs
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                  {kpis.openJobs}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-border/70 bg-workspace-muted-surface/70 px-4 py-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Active Submissions
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                  {kpis.activeSubmissions}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-border/70 bg-workspace-muted-surface/70 px-4 py-3">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Overdue Tasks
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                  {kpis.overdueTasks}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-border/70 bg-workspace-muted-surface/70 px-4 py-4 text-sm leading-6 text-muted-foreground">
              Workspace summary metrics are temporarily unavailable, but the shell
              remains active.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[1.85rem]">
        <CardHeader>
          <CardTitle className="text-lg tracking-[-0.03em]">Quick jumps</CardTitle>
          <CardDescription>
            Keep the workspace moving without dropping into the marketing shell.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button asChild variant="outline" className="h-11 w-full justify-between rounded-2xl">
            <TrackedLink href="/dashboard">
              <span className="inline-flex items-center gap-2">
                <LayoutDashboard className="size-4" />
                Dashboard
              </span>
              <ArrowRight className="size-4" />
            </TrackedLink>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full justify-between rounded-2xl">
            <TrackedLink href="/pipeline">
              <span className="inline-flex items-center gap-2">
                <Workflow className="size-4" />
                Pipeline
              </span>
              <ArrowRight className="size-4" />
            </TrackedLink>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full justify-between rounded-2xl">
            <TrackedLink href="/tasks">
              <span className="inline-flex items-center gap-2">
                <SquareKanban className="size-4" />
                Tasks
              </span>
              <ArrowRight className="size-4" />
            </TrackedLink>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full justify-between rounded-2xl">
            <TrackedLink href="/jobs">
              <span className="inline-flex items-center gap-2">
                <BriefcaseBusiness className="size-4" />
                Jobs
              </span>
              <ArrowRight className="size-4" />
            </TrackedLink>
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-[1.85rem]">
        <CardHeader>
          <CardTitle className="text-lg tracking-[-0.03em]">Recent activity</CardTitle>
          <CardDescription>
            A compact digest from the real audit and account activity stream.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityDigestList
            items={activity}
            emptyMessage="No recent activity has been recorded for this workspace yet."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export { WorkspaceContextRail };
