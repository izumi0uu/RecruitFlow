"use client";

import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  FlaskConical,
  LogOut,
  RefreshCw,
  UserRound,
} from "lucide-react";

import {
  clearDevSessionAction,
  ensureDevTestAccountsAction,
  switchDevAccountAction,
} from "@/lib/dev/actions";
import {
  DEV_TEST_ACCOUNTS,
  DEV_TEST_ACCOUNT_PASSWORD,
  DEV_WORKSPACES,
} from "@/lib/dev/test-account-definitions";
import {
  currentUserQueryOptions,
  currentWorkspaceQueryOptions,
} from "@/lib/query/options";
import { Button } from "@/components/ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

type DevToolState = {
  error?: string;
  success?: string;
};

const normalizeRedirectTarget = (pathname: string) => {
  if (
    pathname === "/" ||
    pathname === "/pricing" ||
    pathname === "/sign-in" ||
    pathname === "/sign-up"
  ) {
    return "/dashboard";
  }

  return pathname;
};

const DevAccountSwitcher = () => {
  const pathname = usePathname();
  const redirectTo = normalizeRedirectTarget(pathname);
  const workspaceNames = Object.fromEntries(
    DEV_WORKSPACES.map((workspace) => [workspace.key, workspace.name]),
  );
  const { data: user } = useQuery(currentUserQueryOptions());
  const { data: workspace } = useQuery(currentWorkspaceQueryOptions());
  const [state, ensureAccountsAction, isEnsurePending] = useActionState<
    DevToolState,
    FormData
  >(ensureDevTestAccountsAction, {});

  return (
    <div className="fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            className="rounded-full border border-border/70 bg-background/90 px-4 shadow-[0_20px_60px_-35px_var(--shadow-color)] backdrop-blur-xl"
          >
            <FlaskConical className="size-4" />
            Dev
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[min(92vw,24rem)] p-3">
          <DropdownMenuLabel className="px-0 py-0 normal-case tracking-normal">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Development Session Tools
              </p>
              <p className="text-xs font-normal leading-5 text-muted-foreground">
                Current: {user?.email || "Signed out"}
                {workspace?.name ? ` in ${workspace.name}` : ""}
              </p>
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="mx-0 my-3" />

          <form action={ensureAccountsAction}>
            <Button
              type="submit"
              variant="outline"
              className="w-full justify-start rounded-2xl"
              disabled={isEnsurePending}
            >
              <RefreshCw className={isEnsurePending ? "size-4 animate-spin" : "size-4"} />
              {isEnsurePending ? "Preparing accounts..." : "Ensure test accounts"}
            </Button>
          </form>

          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Shared password for manual sign-in: <span className="font-medium text-foreground">{DEV_TEST_ACCOUNT_PASSWORD}</span>
          </p>

          {state.error ? (
            <p className="status-message status-error mt-3">{state.error}</p>
          ) : null}
          {state.success ? (
            <p className="status-message status-success mt-3">{state.success}</p>
          ) : null}

          <DropdownMenuSeparator className="mx-0 my-3" />

          <div className="space-y-2">
            {DEV_TEST_ACCOUNTS.map((account) => {
              const isCurrentAccount = user?.email === account.email;
              const workspaceLabel = account.workspaceKey
                ? workspaceNames[account.workspaceKey]
                : "No workspace";

              return (
                <form key={account.key} action={switchDevAccountAction}>
                  <input type="hidden" name="accountKey" value={account.key} />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <Button
                    type="submit"
                    variant="ghost"
                    className="h-auto w-full justify-start rounded-2xl px-3 py-3 text-left"
                  >
                    <UserRound className="mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <span>{account.name}</span>
                        {isCurrentAccount ? (
                          <span className="rounded-full border border-border/70 bg-surface-1 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                            Current
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {account.email} · {account.role} · {workspaceLabel}
                      </span>
                    </span>
                    <ArrowRightLeft className="size-4 shrink-0 text-muted-foreground" />
                  </Button>
                </form>
              );
            })}
          </div>

          <DropdownMenuSeparator className="mx-0 my-3" />

          <form action={clearDevSessionAction}>
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <Button
              type="submit"
              variant="outline"
              className="w-full justify-start rounded-2xl"
            >
              <LogOut className="size-4" />
              Clear session
            </Button>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export { DevAccountSwitcher };
