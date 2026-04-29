"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  FileText,
  LayoutDashboard,
  Mail,
  Moon,
  Search,
  Settings,
  SquareKanban,
  SunMedium,
  UsersRound,
  Workflow,
} from "lucide-react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useMounted } from "@/hooks/useMounted";
import { currentUserQueryOptions } from "@/lib/query/options";
import { startRouteLoading } from "@/lib/route-loading";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";

const searchItems = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    keywords: "home overview metrics dashboard",
    label: "Dashboard",
  },
  {
    href: "/clients",
    icon: Building2,
    keywords: "accounts companies customers clients",
    label: "Clients",
  },
  {
    href: "/jobs",
    icon: BriefcaseBusiness,
    keywords: "roles requisitions jobs intake",
    label: "Jobs",
  },
  {
    href: "/candidates",
    icon: UsersRound,
    keywords: "people talent candidates profiles",
    label: "Candidates",
  },
  {
    href: "/pipeline",
    icon: Workflow,
    keywords: "submissions stages pipeline kanban",
    label: "Pipeline",
  },
  {
    href: "/tasks",
    icon: SquareKanban,
    keywords: "follow ups reminders tasks work",
    label: "Tasks",
  },
  {
    href: "/documents",
    icon: FileText,
    keywords: "files docs resumes documents",
    label: "Documents",
  },
  {
    href: "/settings",
    icon: Settings,
    keywords: "account billing members settings",
    label: "Settings",
  },
] as const;

const getUserInitials = (name?: string | null, email?: string | null) => {
  const source = name?.trim() || email?.split("@")[0] || "RF";

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
};

const WorkspaceTopBar = () => {
  const mounted = useMounted();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const { data: user } = useQuery(currentUserQueryOptions());
  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!trimmedQuery) return searchItems.slice(0, 4);

    return searchItems
      .filter((item) => {
        const haystack = `${item.label} ${item.keywords}`.toLowerCase();

        return haystack.includes(trimmedQuery);
      })
      .slice(0, 5);
  }, [trimmedQuery]);
  const isDark = mounted && resolvedTheme === "dark";

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const [firstResult] = results;
    if (!firstResult) return;

    startRouteLoading();
    router.push(firstResult.href);
    setQuery("");
  };

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <header className="workspace-topbar mb-6 flex flex-col gap-4 rounded-[1.75rem] px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
      <form className="relative w-full lg:max-w-[26rem]" onSubmit={submitSearch}>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="h-12 w-full rounded-[1.05rem] border border-border/80 bg-background/88 pl-11 pr-4 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_18px_44px_-34px_var(--shadow-color)] outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/15"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search workspace"
          aria-label="Search workspace"
        />
        {query ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-[1.15rem] border border-border/75 bg-popover p-1.5 shadow-[0_28px_72px_-44px_var(--shadow-color)]">
            {results.length > 0 ? (
              results.map((item) => {
                const Icon = item.icon;

                return (
                  <TrackedLink
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-[0.9rem] px-3 py-2.5 text-sm text-popover-foreground transition-colors hover:bg-surface-2"
                    onClick={() => setQuery("")}
                  >
                    <span className="flex size-8 items-center justify-center rounded-[0.8rem] bg-surface-1">
                      <Icon className="size-4" />
                    </span>
                    {item.label}
                  </TrackedLink>
                );
              })
            ) : (
              <p className="px-3 py-3 text-sm text-muted-foreground">
                No workspace shortcuts found.
              </p>
            )}
          </div>
        ) : null}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
        <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/72 p-1 shadow-[0_18px_44px_-34px_var(--shadow-color)]">
          <SunMedium
            className={cn(
              "ml-2 size-5",
              isDark ? "text-muted-foreground" : "text-foreground",
            )}
          />
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "relative h-7 w-12 rounded-full border-0 bg-surface-3 p-0 shadow-none transition-colors hover:bg-surface-3",
              isDark && "bg-surface-1 hover:bg-surface-1",
            )}
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          >
            <span
              className={cn(
                "absolute left-1 top-1 size-5 rounded-full bg-[oklch(0.8_0.1_330)] shadow-[0_8px_18px_-10px_rgba(0,0,0,0.5)] transition-transform",
                isDark && "translate-x-5 bg-foreground",
              )}
            />
          </Button>
          <Moon
            className={cn(
              "mr-2 size-5",
              isDark ? "text-foreground" : "text-muted-foreground",
            )}
          />
        </div>

        <div className="hidden h-9 w-px bg-border/80 sm:block" />

        <div className="flex items-center gap-2">
          <TrackedLink
            href="/documents"
            className="flex size-11 items-center justify-center rounded-full border border-border/70 bg-background/72 text-foreground shadow-[0_18px_44px_-34px_var(--shadow-color)] transition-colors hover:bg-surface-2"
            title="Documents"
          >
            <Mail className="size-5" />
            <span className="sr-only">Documents</span>
          </TrackedLink>
          <TrackedLink
            href="/settings/activity"
            className="relative flex size-11 items-center justify-center rounded-full border border-border/70 bg-background/72 text-foreground shadow-[0_18px_44px_-34px_var(--shadow-color)] transition-colors hover:bg-surface-2"
            title="Activity"
          >
            <Bell className="size-5" />
            <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-success ring-2 ring-background" />
            <span className="sr-only">Activity</span>
          </TrackedLink>
        </div>

        <div className="hidden h-9 w-px bg-border/80 sm:block" />

        <TrackedLink
          href="/settings/general"
          className="flex items-center gap-3 rounded-full border border-border/70 bg-background/72 py-1.5 pl-4 pr-1.5 shadow-[0_18px_44px_-34px_var(--shadow-color)] transition-colors hover:bg-surface-2"
        >
          <span className="hidden text-right sm:block">
            <span className="block text-sm font-semibold text-foreground">
              {user?.name || user?.email?.split("@")[0] || "RecruitFlow user"}
            </span>
            <span className="mt-0.5 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full bg-success" />
              Online
            </span>
          </span>
          <Avatar className="size-10 border-transparent">
            <AvatarFallback>
              {getUserInitials(user?.name, user?.email)}
            </AvatarFallback>
          </Avatar>
        </TrackedLink>
      </div>
    </header>
  );
};

export { WorkspaceTopBar };
