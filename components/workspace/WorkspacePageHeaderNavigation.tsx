"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import { hasPreviousWorkspaceRoute } from "@/components/workspace/workspaceRouteHistory";
import { startRouteLoading } from "@/lib/route-loading";
import { cn } from "@/lib/utils";

type WorkspaceBreadcrumbItem = {
  className?: string;
  href?: string;
  label: string;
};

type WorkspacePageHeaderNavigationProps = {
  backDisabled?: boolean;
  backHref?: string;
  backLabel?: string;
  breadcrumbItems?: WorkspaceBreadcrumbItem[];
  className?: string;
  showBackButton?: boolean;
};

const getCurrentHref = (
  pathname: string,
  searchParams: { toString: () => string },
) => {
  const query = searchParams.toString();

  return query ? `${pathname}?${query}` : pathname;
};

const WorkspacePageHeaderNavigation = ({
  backDisabled = false,
  backHref,
  backLabel = "Back",
  breadcrumbItems = [],
  className,
  showBackButton = Boolean(backHref),
}: WorkspacePageHeaderNavigationProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentHref = getCurrentHref(pathname, searchParams);
  const hasBreadcrumbs = breadcrumbItems.length > 0;
  const shouldRender = showBackButton || hasBreadcrumbs;

  if (!shouldRender) {
    return null;
  }

  const handleBack = () => {
    if (backDisabled) {
      return;
    }

    if (hasPreviousWorkspaceRoute(currentHref)) {
      router.back();
      return;
    }

    if (backHref) {
      startRouteLoading();
      router.push(backHref);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 text-sm text-muted-foreground",
        className,
      )}
    >
      {showBackButton ? (
        <Button
          className="h-9 rounded-full px-3.5 text-xs"
          disabled={backDisabled}
          type="button"
          variant="outline"
          onClick={handleBack}
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Button>
      ) : null}

      {hasBreadcrumbs ? (
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex min-w-0 flex-wrap items-center gap-2">
            {breadcrumbItems.map((item, index) => {
              const isCurrent = index === breadcrumbItems.length - 1;
              const key = `${item.label}-${index}`;

              return (
                <li
                  className="inline-flex min-w-0 items-center gap-2"
                  key={key}
                >
                  {item.href && !isCurrent ? (
                    <TrackedLink
                      className={cn(
                        "min-w-0 truncate font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline",
                        item.className,
                      )}
                      href={item.href}
                    >
                      {item.label}
                    </TrackedLink>
                  ) : (
                    <span
                      aria-current={isCurrent ? "page" : undefined}
                      className={cn(
                        "min-w-0 truncate font-medium",
                        isCurrent ? "text-foreground" : "text-muted-foreground",
                        item.className,
                      )}
                    >
                      {item.label}
                    </span>
                  )}

                  {!isCurrent ? (
                    <span aria-hidden="true" className="shrink-0 opacity-60">
                      /
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}
    </div>
  );
};

export type { WorkspaceBreadcrumbItem };
export { WorkspacePageHeaderNavigation };
