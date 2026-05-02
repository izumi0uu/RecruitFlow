"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { customerPortalAction } from "@/lib/payments/actions";
import {
  currentUserQueryOptions,
  currentWorkspaceQueryOptions,
} from "@/lib/query/options";

const subscriptionTone = (status?: string | null) => {
  if (status === "active" || status === "trialing") {
    return "status-message status-success";
  }

  return "status-message border-border/70 bg-surface-1/70 text-muted-foreground";
};

const subscriptionLabel = (status?: string | null) => {
  if (status === "active") {
    return "Active";
  }

  if (status === "trialing") {
    return "Trialing";
  }

  return "Inactive";
};

const BillingSectionSkeleton = () => (
  <Card className="h-full">
    <CardHeader>
      <CardTitle>Workspace subscription</CardTitle>
      <CardDescription>Loading your current plan details.</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="animate-pulse space-y-4">
        <div className="h-12 rounded-[1.25rem] bg-surface-2" />
        <div className="h-28 rounded-[1.5rem] bg-surface-2" />
      </div>
    </CardContent>
  </Card>
);

const BillingSection = () => {
  const { data: user } = useSuspenseQuery(currentUserQueryOptions());
  const { data: workspaceData } = useSuspenseQuery(
    currentWorkspaceQueryOptions(),
  );
  const isOwner = user?.role === "owner";

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Workspace subscription</CardTitle>
        <CardDescription>
          Review your current workspace plan and open the billing portal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className={subscriptionTone(workspaceData?.subscriptionStatus)}>
            {subscriptionLabel(workspaceData?.subscriptionStatus)}
          </span>
          <span className="text-sm text-muted-foreground">
            {workspaceData?.subscriptionStatus === "active"
              ? "Billed monthly"
              : workspaceData?.subscriptionStatus === "trialing"
                ? "Trial period in progress"
                : "No active subscription"}
          </span>
        </div>

        <div className="rounded-[1.5rem] border border-border/70 bg-surface-1/70 p-5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Current plan
          </p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-3xl font-semibold tracking-[-0.05em] text-foreground">
                {workspaceData?.planName || "Free"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Switch plans, update payment methods, or review seats from the
                billing portal.
              </p>
            </div>
            <form action={customerPortalAction}>
              <Button
                type="submit"
                variant="outline"
                className="rounded-full"
                disabled={!isOwner}
              >
                Manage subscription
              </Button>
            </form>
          </div>
        </div>
      </CardContent>

      {!isOwner ? (
        <CardFooter>
          <p className="text-sm leading-6 text-muted-foreground">
            Only workspace owners can manage billing and subscriptions.
          </p>
        </CardFooter>
      ) : null}
    </Card>
  );
};

export { BillingSection, BillingSectionSkeleton };
