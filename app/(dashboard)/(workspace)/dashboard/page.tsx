import {
  BriefcaseBusiness,
  Building2,
  FileText,
  type LucideIcon,
  Settings,
  SquareKanban,
  UsersRound,
  Workflow,
} from "lucide-react";

import { ActivityDigestList } from "@/components/dashboard/ActivityDigestList";
import { DashboardAreaChart } from "@/components/dashboard/DashboardAreaChart";
import { DashboardBarChart } from "@/components/dashboard/DashboardBarChart";
import { DashboardRingChart } from "@/components/dashboard/DashboardRingChart";
import { DashboardSection } from "@/components/dashboard/DashboardSection";
import {
  DashboardHeroMetricTile,
  DashboardMetricPill,
} from "@/components/dashboard/DashboardStatCard";
import { SubmissionDigestList } from "@/components/dashboard/SubmissionDigestList";
import { TaskDigestList } from "@/components/dashboard/TaskDigestList";
import { TaskTodoTable } from "@/components/dashboard/TaskTodoTable";
import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import {
  formatAverageDays,
  formatCountLabel,
  formatLongDate,
  formatRoleLabel,
  getFirstName,
} from "@/lib/dashboard/formatters";
import {
  getDashboardActivityDigest,
  getDashboardAtRiskSubmissions,
  getDashboardKpis,
  getDashboardOperationalPulse,
  getDashboardOutcomeSummary,
  getDashboardOverdueTasks,
  getDashboardRiskBreakdown,
  getDashboardStageDistribution,
  getDashboardStaleSubmissions,
  getDashboardUserTasks,
} from "@/lib/dashboard/queries";
import { requireWorkspace } from "@/lib/db/queries";

const quickLinks: Array<{
  description: string;
  href: string;
  icon: LucideIcon;
  title: string;
}> = [
  {
    href: "/clients",
    icon: Building2,
    title: "Clients",
    description: "Company relationships, owners, and account priorities.",
  },
  {
    href: "/jobs",
    icon: BriefcaseBusiness,
    title: "Jobs",
    description: "Open roles, hiring managers, and intake status.",
  },
  {
    href: "/candidates",
    icon: UsersRound,
    title: "Candidates",
    description: "Profiles, notes, documents, and review readiness.",
  },
  {
    href: "/pipeline",
    icon: Workflow,
    title: "Pipeline",
    description: "Stage movement, risk flags, and view switching.",
  },
  {
    href: "/tasks",
    icon: SquareKanban,
    title: "Tasks",
    description: "My tasks, overdue follow-ups, and workspace queues.",
  },
  {
    href: "/documents",
    icon: FileText,
    title: "Documents",
    description: "Recent files, linked entities, and AI-assisted search.",
  },
  {
    href: "/settings",
    icon: Settings,
    title: "Settings",
    description: "Members, billing, security, and audit controls.",
  },
];

const DashboardFallback = ({ message }: { message: string }) => (
  <div className="rounded-[1.4rem] border border-dashed border-border/70 bg-workspace-muted-surface/55 px-4 py-5 text-sm leading-6 text-muted-foreground">
    {message}
  </div>
);

const DashboardPage = async () => {
  const { membership, user, workspace } = await requireWorkspace();
  const [
    kpisResult,
    pulseResult,
    stageResult,
    riskResult,
    atRiskResult,
    staleResult,
    overdueResult,
    myTasksResult,
    outcomeResult,
    activityResult,
  ] = await Promise.allSettled([
    getDashboardKpis(workspace.id),
    getDashboardOperationalPulse(workspace.id),
    getDashboardStageDistribution(workspace.id),
    getDashboardRiskBreakdown(workspace.id),
    getDashboardAtRiskSubmissions(workspace.id),
    getDashboardStaleSubmissions(workspace.id),
    getDashboardOverdueTasks(workspace.id),
    getDashboardUserTasks(workspace.id, user.id),
    getDashboardOutcomeSummary(workspace.id),
    getDashboardActivityDigest(workspace.id),
  ]);
  const kpis = kpisResult.status === "fulfilled" ? kpisResult.value : null;
  const pulse = pulseResult.status === "fulfilled" ? pulseResult.value : null;
  const stageDistribution =
    stageResult.status === "fulfilled" ? stageResult.value : null;
  const riskBreakdown =
    riskResult.status === "fulfilled" ? riskResult.value : null;
  const atRiskItems =
    atRiskResult.status === "fulfilled" ? atRiskResult.value : [];
  const staleItems =
    staleResult.status === "fulfilled" ? staleResult.value : [];
  const overdueItems =
    overdueResult.status === "fulfilled" ? overdueResult.value : [];
  const myTaskItems =
    myTasksResult.status === "fulfilled" ? myTasksResult.value : [];
  const outcomeSummary =
    outcomeResult.status === "fulfilled" ? outcomeResult.value : null;
  const activityItems =
    activityResult.status === "fulfilled" ? activityResult.value : [];

  const riskTotal =
    riskBreakdown?.reduce((sum, segment) => sum + segment.value, 0) ?? 0;
  const atRiskCount =
    riskBreakdown
      ?.filter((segment) => segment.key !== "none")
      .reduce((sum, segment) => sum + segment.value, 0) ?? 0;
  const heroSummary = kpis
    ? `${kpis.activeClients} client accounts are in motion, ${kpis.openJobs} roles remain open, and ${kpis.overdueTasks} follow-ups need attention today.`
    : "The workspace shell is live, but some dashboard aggregates are still loading.";
  const heroMetrics = [
    {
      href: "/clients",
      icon: <Building2 className="size-4" />,
      label: "Active Clients",
      value: kpis ? `${kpis.activeClients}` : "—",
    },
    {
      href: "/jobs",
      icon: <BriefcaseBusiness className="size-4" />,
      label: "Open Jobs",
      value: kpis ? `${kpis.openJobs}` : "—",
    },
    {
      href: "/pipeline",
      icon: <Workflow className="size-4" />,
      label: "Submissions",
      value: kpis ? `${kpis.activeSubmissions}` : "—",
    },
    {
      href: "/tasks",
      icon: <SquareKanban className="size-4" />,
      label: "Overdue Tasks",
      value: kpis ? `${kpis.overdueTasks}` : "—",
    },
  ];

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <Card className="rounded-[2.1rem]">
        <CardContent className="grid gap-6 pt-1 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.48fr)] xl:items-stretch">
          <div className="flex min-h-[18rem] flex-col justify-between gap-6">
            <div className="space-y-4">
              <span className="inline-kicker">Workspace operating surface</span>
              <div className="space-y-3">
                <h1 className="text-balance text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
                  Hello, {getFirstName(user.name)}.
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                  {heroSummary}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DashboardMetricPill>{workspace.name}</DashboardMetricPill>
                <DashboardMetricPill>
                  {formatRoleLabel(membership.role)}
                </DashboardMetricPill>
                <DashboardMetricPill>
                  {kpis
                    ? formatCountLabel(
                        kpis.activeSubmissions,
                        "live submission",
                      )
                    : "Dashboard sync pending"}
                </DashboardMetricPill>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3">
              <div className="rounded-full border border-border/70 bg-workspace-muted-surface px-4 py-2 text-sm font-medium text-muted-foreground">
                {formatLongDate(new Date())}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild className="rounded-full">
                  <TrackedLink href="/pipeline">Open pipeline</TrackedLink>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <TrackedLink href="/tasks">Review tasks</TrackedLink>
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-[1.7rem] border border-border/70 bg-background/46 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <div className="grid gap-3 sm:grid-cols-2 xl:h-full">
              {heroMetrics.map((metric) => (
                <DashboardHeroMetricTile
                  key={metric.href}
                  href={metric.href}
                  icon={metric.icon}
                  label={metric.label}
                  value={metric.value}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <DashboardSection
        eyebrow="To do"
        title="Recent tasks"
        description="Current-user work due by the end of today, including overdue carryover."
        action={
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <TrackedLink href="/tasks">Review all</TrackedLink>
          </Button>
        }
      >
        {myTasksResult.status === "fulfilled" ? (
          <TaskTodoTable
            items={myTaskItems}
            emptyMessage={`${getFirstName(user.name)}, you do not have any tasks due today.`}
          />
        ) : (
          <DashboardFallback message="Your current task queue could not be loaded." />
        )}
      </DashboardSection>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] xl:items-stretch">
        <div className="grid gap-6">
          <DashboardSection
            eyebrow="Trend"
            title="Operational pulse"
            description="Submission touches and follow-up demand over the last seven days."
            className="h-auto self-start"
            action={
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-full"
              >
                <TrackedLink href="/pipeline">Pipeline view</TrackedLink>
              </Button>
            }
          >
            {pulse ? (
              <DashboardAreaChart
                aspectRatio="640 / 210"
                data={pulse}
                series={[
                  {
                    color: "var(--chart-primary)",
                    dataKey: "submissionTouches",
                    label: "Submission touches",
                  },
                  {
                    color: "var(--chart-secondary)",
                    dataKey: "followUps",
                    label: "Follow-up load",
                  },
                ]}
              />
            ) : (
              <DashboardFallback message="Operational trend data could not be loaded, but the rest of the dashboard remains available." />
            )}
          </DashboardSection>

          <DashboardSection
            eyebrow="Risk"
            title="Risk mix"
            description="A quick read on healthy work versus submissions carrying delivery risk."
          >
            {riskBreakdown ? (
              <DashboardRingChart
                centerLabel="At Risk"
                centerValue={`${atRiskCount}/${riskTotal || 0}`}
                data={riskBreakdown.map((segment) => ({
                  label: segment.label,
                  tone: segment.tone,
                  value: segment.value,
                }))}
              />
            ) : (
              <DashboardFallback message="Risk distribution is temporarily unavailable." />
            )}
          </DashboardSection>
        </div>

        <DashboardSection
          eyebrow="Flow"
          title="Stage distribution"
          description="Pipeline volume grouped by the current submission stage."
          contentClassName="flex flex-1 min-h-0"
        >
          {stageDistribution ? (
            <DashboardBarChart data={stageDistribution} fillHeight />
          ) : (
            <DashboardFallback message="Stage distribution is temporarily unavailable." />
          )}
        </DashboardSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardSection
          eyebrow="Pipeline"
          title="At-risk submissions"
          description="Fragile opportunities that need active owner attention."
        >
          {atRiskResult.status === "fulfilled" ? (
            <SubmissionDigestList
              items={atRiskItems}
              emptyMessage="No active submissions are flagged as risky right now."
            />
          ) : (
            <DashboardFallback message="At-risk submission data could not be loaded." />
          )}
        </DashboardSection>

        <DashboardSection
          eyebrow="Pipeline"
          title="Stale work"
          description="Active submissions that have not been touched since before today."
        >
          {staleResult.status === "fulfilled" ? (
            <SubmissionDigestList
              items={staleItems}
              emptyMessage="Everything active has been touched today."
            />
          ) : (
            <DashboardFallback message="Stale submission data could not be loaded." />
          )}
        </DashboardSection>
      </div>

      <div className="grid gap-6">
        <DashboardSection
          eyebrow="Execution"
          title="Overdue follow-ups"
          description="Workspace-level misses that should become the next actions."
          action={
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <TrackedLink href="/tasks">Open tasks</TrackedLink>
            </Button>
          }
        >
          {overdueResult.status === "fulfilled" ? (
            <TaskDigestList
              items={overdueItems}
              emptyMessage="No workspace follow-ups are overdue right now."
            />
          ) : (
            <DashboardFallback message="Overdue task data could not be loaded." />
          )}
        </DashboardSection>
      </div>

      <DashboardSection
        eyebrow="Activity"
        title="Recent activity digest"
        description="A capped workspace feed from audit and account activity, ordered newest first."
        action={
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <TrackedLink href="/settings/activity">Open activity</TrackedLink>
          </Button>
        }
      >
        {activityResult.status === "fulfilled" ? (
          <ActivityDigestList
            items={activityItems}
            emptyMessage="No recent activity has been recorded for this workspace yet. Sign-ins, member changes, submissions, tasks, documents, and audit events will populate this digest."
          />
        ) : (
          <DashboardFallback message="Recent activity could not be loaded, but the dashboard metrics remain available." />
        )}
      </DashboardSection>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_minmax(0,1.15fr)]">
        <DashboardSection
          eyebrow="Outcomes"
          title="Time to submit"
          description="Average time from job intake opening to the first candidate submission."
        >
          {outcomeSummary ? (
            <div className="space-y-4">
              <div className="rounded-[1.5rem] border border-border/70 bg-workspace-muted-surface/70 px-4 py-5">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Average cycle
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">
                  {formatAverageDays(outcomeSummary.averageTimeToSubmitDays)}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  The metric stays explainable even when the workspace has not
                  yet recorded a formal placement.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.35rem] border border-border/70 bg-workspace-muted-surface/55 px-4 py-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Placements
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                    {outcomeSummary.recentPlacements.length}
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-border/70 bg-workspace-muted-surface/55 px-4 py-4">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Demo posture
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground">
                    Enough operational data is present to explain the workflow,
                    even before a placed record exists.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <DashboardFallback message="Outcome metrics could not be loaded." />
          )}
        </DashboardSection>

        <DashboardSection
          eyebrow="Outcomes"
          title="Recent placements"
          description="Closed wins land here when the workspace records placed submissions."
        >
          {outcomeResult.status === "fulfilled" ? (
            outcomeSummary && outcomeSummary.recentPlacements.length > 0 ? (
              <div className="space-y-3">
                {outcomeSummary.recentPlacements.map((placement) => (
                  <TrackedLink
                    key={placement.id}
                    href="/pipeline"
                    className="block rounded-[1.4rem] border border-border/70 bg-workspace-muted-surface/55 px-4 py-4 transition-colors hover:bg-surface-2"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-foreground">
                          {placement.candidateName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {placement.jobTitle} · {placement.clientName}
                        </p>
                      </div>
                      <DashboardMetricPill>
                        {placement.ownerName ?? "Unassigned"}
                      </DashboardMetricPill>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Closed on {formatLongDate(placement.placedAt)}
                    </p>
                  </TrackedLink>
                ))}
              </div>
            ) : (
              <DashboardFallback message="No placements have been recorded yet. Keep using the dashboard to explain pipeline health, overdue follow-ups, and time-to-submit while the outcome layer fills in." />
            )
          ) : (
            <DashboardFallback message="Placement history could not be loaded." />
          )}
        </DashboardSection>
      </div>
    </section>
  );
};

export default DashboardPage;
