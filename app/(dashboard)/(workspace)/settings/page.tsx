"use client";

import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { currentUserQueryOptions } from "@/lib/query/options";

import {
  BillingSection,
  BillingSectionSkeleton,
} from "./components/BillingSection";
import {
  MembersSection,
  MembersSectionSkeleton,
} from "./components/MembersSection";
import { WorkspaceActionsDock } from "./components/WorkspaceActionsDock";

const SettingsGateSkeleton = () => (
  <div className="flex h-full min-h-0 flex-col gap-5">
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
      <div className="space-y-4">
        <div className="h-8 w-52 animate-pulse rounded-full bg-surface-2" />
        <div className="h-12 w-80 max-w-full animate-pulse rounded-full bg-surface-2" />
        <div className="h-16 w-[36rem] max-w-full animate-pulse rounded-[1.5rem] bg-surface-2" />
      </div>
      <div className="flex gap-2 xl:justify-end">
        <div className="size-12 animate-pulse rounded-[1.05rem] bg-surface-2" />
        <div className="size-12 animate-pulse rounded-[1.05rem] bg-surface-2" />
        <div className="size-12 animate-pulse rounded-[1.05rem] bg-surface-2" />
      </div>
    </div>

    <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-2">
      <BillingSectionSkeleton />
      <MembersSectionSkeleton />
    </div>
  </div>
);

const SettingsRestrictedState = () => (
  <Card className="w-full">
    <CardHeader>
      <CardTitle>Restricted workspace settings</CardTitle>
      <CardDescription>
        Billing controls and membership administration stay limited to
        workspace owners.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-5">
      <div className="rounded-[1.5rem] border border-border/70 bg-surface-1/75 p-5">
        <p className="text-sm font-medium text-foreground">
          This route is protected correctly, but the current role does not have
          access to owner-only settings actions.
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Recruiters and coordinators can continue working through the shared
          recruiting shell while workspace owners manage billing, invitations,
          and membership changes from this screen.
        </p>
      </div>
    </CardContent>
  </Card>
);

const SettingsSections = () => (
  <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-2">
    <Suspense fallback={<BillingSectionSkeleton />}>
      <BillingSection />
    </Suspense>
    <Suspense fallback={<MembersSectionSkeleton />}>
      <MembersSection />
    </Suspense>
  </div>
);

const SettingsPageContent = () => {
  const { data: user } = useSuspenseQuery(currentUserQueryOptions());
  const isOwner = user?.role === "owner";

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <WorkspacePageHeader
        kicker="Workspace settings"
        title="Workspace settings"
        description="Shape who has access to the workspace, how billing behaves, and how collaborators move through the same recruiting surface."
        rightSlot={<WorkspaceActionsDock isOwner={isOwner} />}
        rightSlotClassName="xl:pt-1"
      />

      {isOwner ? <SettingsSections /> : <SettingsRestrictedState />}
    </div>
  );
};

const SettingsPage = () => (
  <section className="h-full min-h-0 px-0 py-1 lg:py-0">
    <Suspense fallback={<SettingsGateSkeleton />}>
      <SettingsPageContent />
    </Suspense>
  </section>
);

export default SettingsPage;
