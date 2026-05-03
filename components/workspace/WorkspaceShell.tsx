"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  Building2,
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  SquareKanban,
  UsersRound,
  Workflow,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { signOut } from "@/app/(login)/actions";
import { BrandLockup, BrandMark } from "@/components/Brand";
import { TrackedLink } from "@/components/navigation/TrackedLink";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { WorkspaceTopBar } from "@/components/workspace/WorkspaceTopBar";
import { appendWorkspaceRouteHistory } from "@/components/workspace/workspaceRouteHistory";
import { userQueryKey, workspaceQueryKey } from "@/lib/query/options";
import { startRouteLoading } from "@/lib/route-loading";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/clients", icon: Building2, label: "Clients" },
  { href: "/jobs", icon: BriefcaseBusiness, label: "Jobs" },
  { href: "/candidates", icon: UsersRound, label: "Candidates" },
  { href: "/pipeline", icon: Workflow, label: "Pipeline" },
  { href: "/tasks", icon: SquareKanban, label: "Tasks" },
  { href: "/documents", icon: FileText, label: "Documents" },
] as const;

const bottomNavItems = [
  { href: "/settings", icon: Settings, label: "Settings" },
] as const;

const allNavItems = [...navItems, ...bottomNavItems] as const;

const isRouteActive = (pathname: string, href: string) => {
  if (href === "/dashboard") {
    return pathname === href || pathname.startsWith("/dashboard/");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

const getCurrentWorkspaceHref = (
  pathname: string,
  searchParams: { toString: () => string },
) => {
  const query = searchParams.toString();

  return query ? `${pathname}?${query}` : pathname;
};

type WorkspaceShellProps = {
  children: React.ReactNode;
  contextPanel?: React.ReactNode;
  workspaceName: string;
};

const WorkspaceShell = ({
  children,
  contextPanel,
  workspaceName,
}: WorkspaceShellProps) => {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const currentHref = getCurrentWorkspaceHref(pathname, searchParams);

  const activeItem =
    allNavItems.find((item) => isRouteActive(pathname, item.href)) ||
    navItems[0];

  useEffect(() => {
    appendWorkspaceRouteHistory(currentHref);
  }, [currentHref]);

  const handleSignOut = async () => {
    await signOut();
    queryClient.setQueryData(userQueryKey, null);
    queryClient.setQueryData(workspaceQueryKey, null);
    queryClient.removeQueries({ queryKey: userQueryKey, exact: true });
    queryClient.removeQueries({ queryKey: workspaceQueryKey, exact: true });
    startRouteLoading();
    router.push("/");
  };

  return (
    <div
      className={cn(
        "flex min-h-dvh w-full max-w-none flex-col gap-4 bg-surface-2/65 px-3 pb-8 pt-4 sm:px-4 md:grid md:items-start md:gap-5 md:px-4 md:py-0 xl:gap-6 xl:px-6 2xl:px-8",
        contextPanel
          ? "md:grid-cols-[88px_minmax(0,1fr)] xl:grid-cols-[88px_minmax(0,1fr)_340px]"
          : "md:grid-cols-[88px_minmax(0,1fr)]",
      )}
    >
      <div className="workspace-rail flex items-center justify-between rounded-[1.45rem] px-4 py-3 md:hidden">
        <div className="min-w-0">
          <p className="truncate text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {workspaceName}
          </p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">
            {activeItem.label}
          </h2>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu className="size-4" />
          <span className="sr-only">Open workspace navigation</span>
        </Button>
      </div>

      <Button
        type="button"
        variant="ghost"
        className={cn(
          "fixed inset-0 z-40 block h-auto w-auto rounded-none border-0 bg-black/30 p-0 shadow-none backdrop-blur-sm transition-opacity hover:bg-black/30 md:hidden",
          isSidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onClick={() => setIsSidebarOpen(false)}
        aria-label="Close workspace navigation"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[min(88vw,20rem)] p-3 transition-transform duration-300 md:hidden",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="workspace-rail flex h-full min-h-[calc(100dvh-1.5rem)] flex-col rounded-[1.65rem] p-4">
          <div className="flex items-center justify-between border-b border-border/70 pb-4">
            <BrandLockup compact />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="size-4" />
              <span className="sr-only">Close navigation</span>
            </Button>
          </div>

          <div className="mt-4 rounded-[1.15rem] border border-border/70 bg-workspace-muted-surface/80 p-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Active workspace
            </p>
            <p className="mt-2 truncate text-sm font-semibold text-foreground">
              {workspaceName}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Focused recruiting ops, separated from marketing chrome.
            </p>
          </div>

          <nav className="mt-5 space-y-1.5">
            {allNavItems.map((item) => {
              const isActive = isRouteActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <Button
                  key={item.href}
                  asChild
                  variant="ghost"
                  className={cn(
                    "h-10 w-full justify-start gap-3 rounded-[0.95rem] px-3 text-sm text-muted-foreground hover:bg-workspace-muted-surface hover:text-foreground",
                    isActive &&
                      "border-transparent bg-primary text-primary-foreground shadow-[0_18px_42px_-30px_var(--shadow-color)] hover:bg-primary/94 hover:text-primary-foreground",
                  )}
                >
                  <TrackedLink
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </TrackedLink>
                </Button>
              );
            })}
          </nav>

          <div className="mt-auto space-y-2 border-t border-border/70 pt-3">
            <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-border/70 bg-workspace-muted-surface/75 px-3 py-2">
              <div>
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Appearance
                </p>
                <p className="mt-0.5 text-xs text-foreground">Theme</p>
              </div>
              <ThemeToggle />
            </div>
            <Button
              type="button"
              variant="ghost"
              className="h-10 w-full justify-start gap-3 rounded-[0.95rem] px-3 text-sm text-muted-foreground hover:bg-workspace-muted-surface hover:text-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <aside className="sticky top-0 z-30 hidden h-screen self-start md:block">
        <div className="workspace-icon-rail flex h-full min-h-0 flex-col items-center rounded-[1.65rem] px-3 py-5 xl:rounded-[1.75rem] xl:py-6">
          <div className="flex w-full items-center justify-center">
            <TrackedLink
              href="/dashboard"
              className="flex size-14 items-center justify-center rounded-[1.25rem] text-white transition-transform hover:scale-[1.03]"
              aria-label="RecruitFlow dashboard"
            >
              <BrandMark className="size-12 rounded-[1.15rem] border-white/10 bg-transparent text-white shadow-none before:hidden" />
            </TrackedLink>
          </div>

          <nav
            className="mt-20 flex w-full flex-col items-center gap-3"
            aria-label={`${workspaceName} workspace navigation`}
          >
            {navItems.map((item) => {
              const isActive = isRouteActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <TrackedLink
                  key={item.href}
                  className={cn(
                    "group flex size-12 items-center justify-center rounded-[1rem] text-white/62 transition-all hover:bg-white/10 hover:text-white",
                    isActive &&
                      "bg-[oklch(0.91_0.04_205)] text-slate-950 shadow-[0_18px_34px_-26px_rgba(180,230,240,0.8)] hover:bg-[oklch(0.91_0.04_205)] hover:text-slate-950",
                  )}
                  href={item.href}
                  title={item.label}
                >
                  <Icon className="size-5" />
                  <span className="sr-only">{item.label}</span>
                </TrackedLink>
              );
            })}
          </nav>

          <div className="mt-auto flex w-full flex-col items-center gap-3">
            {bottomNavItems.map((item) => {
              const isActive = isRouteActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <TrackedLink
                  key={item.href}
                  className={cn(
                    "flex size-12 items-center justify-center rounded-[1rem] text-white/62 transition-all hover:bg-white/10 hover:text-white",
                    isActive &&
                      "bg-white/13 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
                  )}
                  href={item.href}
                  title={item.label}
                >
                  <Icon className="size-5" />
                  <span className="sr-only">{item.label}</span>
                </TrackedLink>
              );
            })}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-12 rounded-[1rem] border-0 bg-transparent p-0 text-white/62 shadow-none hover:bg-white/10 hover:text-white"
              title="Help"
            >
              <HelpCircle className="size-5" />
              <span className="sr-only">Help</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-12 rounded-[1rem] border-0 bg-transparent p-0 text-white/62 shadow-none hover:bg-white/10 hover:text-white"
              onClick={handleSignOut}
              title="Sign out"
            >
              <LogOut className="size-5" />
              <span className="sr-only">Sign out</span>
            </Button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 py-0 md:py-5 xl:py-6">
        <WorkspaceTopBar />
        {children}
      </main>

      {contextPanel ? (
        <div className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          {contextPanel}
        </div>
      ) : null}
    </div>
  );
};

export { WorkspaceShell };
