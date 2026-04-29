"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Activity, Menu, Settings, Shield, Users, X } from "lucide-react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/settings", icon: Users, label: "Overview" },
  { href: "/settings/general", icon: Settings, label: "General" },
  { href: "/settings/activity", icon: Activity, label: "Activity" },
  { href: "/settings/security", icon: Shield, label: "Security" },
];

const SettingsLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const activeItem =
    navItems.find((item) => pathname === item.href) ?? navItems[0];

  return (
    <div className="flex w-full max-w-none flex-col gap-4 pb-8 pt-0 lg:grid lg:h-[calc(100dvh-8.5rem)] lg:min-h-0 lg:grid-cols-[5rem_minmax(0,1fr)] lg:gap-5 lg:overflow-hidden lg:pb-0">
      <div className="panel-shell flex items-center justify-between px-4 py-3 lg:hidden">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Workspace
          </p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">
            Settings surface
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
          <span className="sr-only">Open settings navigation</span>
        </Button>
      </div>

      <Button
        type="button"
        variant="ghost"
        className={cn(
          "fixed inset-0 z-40 block h-auto w-auto rounded-none border-0 bg-black/30 p-0 shadow-none backdrop-blur-sm transition-opacity hover:bg-black/30 lg:hidden",
          isSidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onClick={() => setIsSidebarOpen(false)}
        aria-label="Close settings navigation"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[min(88vw,20rem)] p-4 transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:block lg:h-full lg:w-auto lg:translate-x-0 lg:p-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="panel-shell flex h-full min-h-[calc(100dvh-2rem)] flex-col rounded-[1.65rem] p-3 lg:min-h-0 lg:items-center lg:p-2">
          <div className="flex w-full items-center justify-between border-b border-border/70 pb-4 lg:justify-center lg:border-b-0 lg:pb-0 lg:pt-1">
            <div className="flex items-center gap-3 lg:flex-col lg:gap-2">
              <span className="flex size-11 items-center justify-center rounded-[1rem] border border-border/70 bg-background/72 text-foreground shadow-[0_18px_44px_-34px_var(--shadow-color)]">
                <Settings className="size-5" />
              </span>
              <div className="lg:hidden">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Settings
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  Workspace controls
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="size-4" />
              <span className="sr-only">Close navigation</span>
            </Button>
          </div>

          <nav className="mt-5 flex w-full flex-col gap-2 lg:mt-6 lg:items-center">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Button
                  key={item.href}
                  asChild
                  variant="ghost"
                  className={cn(
                    "group/nav relative h-11 w-full justify-start gap-3 rounded-[1rem] px-3 text-muted-foreground hover:bg-surface-1 hover:text-foreground lg:size-12 lg:justify-center lg:px-0",
                    isActive &&
                      "border-transparent bg-foreground text-background shadow-[0_18px_40px_-30px_var(--shadow-color)] hover:bg-foreground/95 hover:text-background",
                  )}
                >
                  <TrackedLink
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <Icon className="size-4" />
                    <span className="lg:sr-only">{item.label}</span>
                    <span className="pointer-events-none absolute left-[calc(100%+0.65rem)] top-1/2 z-30 hidden -translate-y-1/2 rounded-full border border-border/70 bg-popover/95 px-3 py-1.5 text-xs font-medium text-popover-foreground opacity-0 shadow-[0_18px_44px_-34px_var(--shadow-color)] backdrop-blur-xl transition-opacity group-hover/nav:opacity-100 group-focus-visible/nav:opacity-100 lg:block">
                      {item.label}
                    </span>
                  </TrackedLink>
                </Button>
              );
            })}
          </nav>

          <div className="mt-auto w-full rounded-[1.15rem] border border-border/70 bg-surface-1/70 px-3 py-3 text-center lg:px-2">
            <p className="truncate font-medium text-foreground text-[10px]">
              {activeItem.label}
            </p>
            <p className="mt-1 text-[6px] uppercase tracking-[0.18em] text-muted-foreground">
              Active
            </p>
          </div>
        </div>
      </aside>

      <main className="min-w-0 w-full lg:min-h-0 lg:overflow-hidden">
        {children}
      </main>
    </div>
  );
};

export default SettingsLayout;
