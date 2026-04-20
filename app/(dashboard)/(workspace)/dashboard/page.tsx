import {
  BriefcaseBusiness,
  Building2,
  FileText,
  LayoutDashboard,
  Settings,
  SquareKanban,
  UsersRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { getCurrentWorkspace } from "@/lib/db/queries";

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

const dashboardSignals = [
  "KPI cards for open jobs, active candidates, and in-flight submissions",
  "Recent activity and workspace change history",
  "Overdue task summaries and handoff reminders",
  "Pipeline stage distribution and open-job snapshots",
];

const DashboardPage = async () => {
  const workspace = await getCurrentWorkspace();

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <div className="space-y-3">
        <span className="inline-kicker">Workspace command center</span>
        <h1 className="text-balance text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
          Dashboard
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
          {workspace
            ? `${workspace.name} now lands inside the shared business shell. This page is the jump hub for Wave 1 modules while the richer dashboard experience is owned later by feature-dashboard-demo-polish.`
            : "This page is the jump hub for Wave 1 modules while the richer dashboard experience is owned later by feature-dashboard-demo-polish."}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-[1rem] border border-border/70 bg-surface-1">
                <LayoutDashboard className="size-4 text-foreground" />
              </span>
              Ready entry points
            </CardTitle>
            <CardDescription>
              The foundation branch owns these top-level routes so downstream
              feature branches can plug into one stable information
              architecture.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {quickLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <TrackedLink
                    key={item.href}
                    href={item.href}
                    className="rounded-[1.5rem] border border-border/70 bg-surface-1/75 p-4 transition-colors hover:bg-surface-1"
                  >
                    <div className="flex size-11 items-center justify-center rounded-[1.1rem] border border-border/70 bg-background/75">
                      <Icon className="size-4 text-foreground" />
                    </div>
                    <p className="mt-4 text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.description}
                    </p>
                  </TrackedLink>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next dashboard signals</CardTitle>
            <CardDescription>
              The fuller `/dashboard` brief from the shared spec still lands
              later, but the target surface is now explicit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboardSignals.map((signal) => (
              <div
                key={signal}
                className="rounded-[1.5rem] border border-border/70 bg-surface-1/75 px-4 py-4"
              >
                <p className="text-sm leading-6 text-foreground">{signal}</p>
              </div>
            ))}

            <Button asChild className="rounded-full">
              <TrackedLink href="/settings">Open workspace settings</TrackedLink>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default DashboardPage;
