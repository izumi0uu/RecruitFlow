"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Activity, Menu, Settings, Shield, Users, X } from "lucide-react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BrandLockup } from "@/components/Brand";
import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-10 pt-6 sm:px-6 lg:flex-row lg:gap-6 lg:px-8">
      <div className="panel-shell flex items-center justify-between px-4 py-3 lg:hidden">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Workspace
          </p>
          <h2 className="mt-1 text-sm font-semibold text-foreground">
            Settings surface
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
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
      </div>

      <button
        type="button"
        className={cn(
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity lg:hidden",
          isSidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
        onClick={() => setIsSidebarOpen(false)}
        aria-label="Close settings navigation"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[min(88vw,20rem)] p-4 transition-transform duration-300 lg:sticky lg:top-[104px] lg:z-auto lg:block lg:w-[280px] lg:translate-x-0 lg:p-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="panel-shell flex h-full min-h-[calc(100dvh-140px)] flex-col p-4">
          <div className="flex items-center justify-between border-b border-border/70 pb-4">
            <BrandLockup compact />
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

          <div className="px-1 pt-5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Workspace settings
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Manage billing, members, account details, and security from one
              shared workspace control surface.
            </p>
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Button
                  key={item.href}
                  asChild
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "h-11 w-full justify-start rounded-2xl px-4",
                    isActive &&
                      "border-foreground/5 bg-foreground text-background hover:bg-foreground/96 hover:text-background"
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

          <div className="mt-auto rounded-[1.5rem] border border-border/70 bg-surface-1/80 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Appearance
                </p>
                <p className="mt-1 text-sm text-foreground">Light, dark, or system</p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
};

export default SettingsLayout;
