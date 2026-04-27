"use client";

import { useEffect, Suspense, useActionState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2, PlusCircle } from "lucide-react";

import { inviteTeamMember, removeTeamMember } from "@/app/(login)/actions";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/RadioGroup";
import { customerPortalAction } from "@/lib/payments/actions";
import {
  currentUserQueryOptions,
  currentWorkspaceQueryOptions,
  workspaceQueryKey,
} from "@/lib/query/options";
import type { CurrentUserDto } from "@/lib/query/types";

type ActionState = {
  error?: string;
  success?: string;
};

type UserIdentity = Pick<NonNullable<CurrentUserDto>, "name" | "email">;

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

const getUserDisplayName = (user: UserIdentity) => {
  return user.name || user.email || "Unknown User";
};

const getUserInitials = (user: UserIdentity) => {
  return getUserDisplayName(user)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
};

const SectionHeader = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  return (
    <div className="mb-8 space-y-3">
      <span className="inline-kicker">Workspace settings</span>
      <h1 className="text-balance text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
        {title}
      </h1>
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
        {description}
      </p>
    </div>
  );
};

const SubscriptionSkeleton = () => {
  return (
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
};

const ManageSubscription = () => {
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

const TeamMembersSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace members</CardTitle>
        <CardDescription>Loading your workspace roster.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="animate-pulse space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="flex items-center gap-4 rounded-[1.5rem] border border-border/70 bg-surface-1/70 px-4 py-4"
            >
              <div className="size-10 rounded-full bg-surface-2" />
              <div className="space-y-2">
                <div className="h-4 w-32 rounded-full bg-surface-2" />
                <div className="h-3 w-20 rounded-full bg-surface-2" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const TeamMembers = () => {
  const queryClient = useQueryClient();
  const { data: user } = useSuspenseQuery(currentUserQueryOptions());
  const { data: workspaceData } = useSuspenseQuery(
    currentWorkspaceQueryOptions(),
  );
  const isOwner = user?.role === "owner";
  const [removeState, removeAction, isRemovePending] = useActionState<
    ActionState,
    FormData
  >(removeTeamMember, {});

  useEffect(() => {
    if (!removeState.success) return;

    queryClient.invalidateQueries({ queryKey: workspaceQueryKey, exact: true });
  }, [queryClient, removeState]);

  if (!workspaceData?.memberships?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workspace members</CardTitle>
          <CardDescription>
            Add collaborators once your workspace is ready to review candidates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-surface-1/60 px-5 py-8 text-sm text-muted-foreground">
            No members yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace members</CardTitle>
        <CardDescription>
          See who currently has access to this workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {workspaceData.memberships.map((member, index) => (
            <li
              key={member.id}
              className="flex flex-col gap-4 rounded-[1.5rem] border border-border/70 bg-surface-1/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <Avatar className="size-11">
                  <AvatarFallback>
                    {getUserInitials(member.user)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">
                    {getUserDisplayName(member.user)}
                  </p>
                  <p className="mt-1 text-sm capitalize text-muted-foreground">
                    {member.role}
                  </p>
                </div>
              </div>

              {isOwner && index > 1 ? (
                <form action={removeAction}>
                  <input type="hidden" name="memberId" value={member.id} />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    disabled={isRemovePending}
                  >
                    {isRemovePending ? "Removing..." : "Remove"}
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>

        {removeState?.error ? (
          <p className="status-message status-error mt-5">
            {removeState.error}
          </p>
        ) : null}

        {!isOwner ? (
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            Only workspace owners can remove members from this workspace.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};

const InviteTeamMemberSkeleton = () => {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Invite member</CardTitle>
        <CardDescription>Loading access controls.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="animate-pulse space-y-4">
          <div className="h-11 rounded-[1.25rem] bg-surface-2" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-24 rounded-[1.5rem] bg-surface-2" />
            <div className="h-24 rounded-[1.5rem] bg-surface-2" />
          </div>
          <div className="h-11 rounded-full bg-surface-2" />
        </div>
      </CardContent>
    </Card>
  );
};

const InviteTeamMember = () => {
  const { data: user } = useSuspenseQuery(currentUserQueryOptions());
  const isOwner = user?.role === "owner";
  const [inviteState, inviteAction, isInvitePending] = useActionState<
    ActionState,
    FormData
  >(inviteTeamMember, {});

  const options = [
    {
      id: "coordinator",
      value: "coordinator",
      label: "Coordinator",
      description: "Keeps follow-ups, scheduling, and shared workflow details moving.",
    },
    {
      id: "recruiter",
      value: "recruiter",
      label: "Recruiter",
      description: "Owns candidate flow, client updates, and day-to-day recruiting work.",
    },
    {
      id: "owner",
      value: "owner",
      label: "Owner",
      description: "Can manage billing, roles, and workspace-wide settings.",
    },
  ];

  return (
      <Card className="h-full">
      <CardHeader>
        <CardTitle>Invite member</CardTitle>
        <CardDescription>
          Add another member when the workspace is ready for more hands.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={inviteAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@company.com"
              required
              disabled={!isOwner}
            />
          </div>

          <div className="space-y-3">
            <Label>Role</Label>
            <RadioGroup
              defaultValue="coordinator"
              name="role"
              className="grid gap-3 lg:grid-cols-3"
              disabled={!isOwner}
            >
              {options.map((option) => (
                <div
                  key={option.id}
                  className="rounded-[1.5rem] border border-border/70 bg-surface-1/75 p-4"
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem
                      value={option.value}
                      id={option.id}
                      className="mt-1"
                    />
                    <div>
                      <Label
                        htmlFor={option.id}
                        className="normal-case tracking-normal text-sm font-medium text-foreground"
                      >
                        {option.label}
                      </Label>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {inviteState?.error ? (
            <p className="status-message status-error">{inviteState.error}</p>
          ) : null}
          {inviteState?.success ? (
            <p className="status-message status-success">
              {inviteState.success}
            </p>
          ) : null}

          <Button
            type="submit"
            className="rounded-full"
            disabled={isInvitePending || !isOwner}
          >
            {isInvitePending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Inviting...
              </>
            ) : (
              <>
                <PlusCircle className="size-4" />
                Invite member
              </>
            )}
          </Button>
        </form>
      </CardContent>

      {!isOwner ? (
        <CardFooter>
          <p className="text-sm leading-6 text-muted-foreground">
            Only workspace owners can invite new teammates.
          </p>
        </CardFooter>
      ) : null}
    </Card>
  );
};

const SettingsGateSkeleton = () => {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <SubscriptionSkeleton />
        <TeamMembersSkeleton />
      </div>
      <InviteTeamMemberSkeleton />
    </div>
  );
};

const SettingsRestrictedState = () => {
  return (
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
            This route is protected correctly, but the current role does not
            have access to owner-only settings actions.
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
};

const SettingsPageContent = () => {
  const { data: user } = useSuspenseQuery(currentUserQueryOptions());

  if (user?.role !== "owner") {
    return <SettingsRestrictedState />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <Suspense fallback={<SubscriptionSkeleton />}>
          <ManageSubscription />
        </Suspense>
        <Suspense fallback={<TeamMembersSkeleton />}>
          <TeamMembers />
        </Suspense>
      </div>

      <Suspense fallback={<InviteTeamMemberSkeleton />}>
        <InviteTeamMember />
      </Suspense>
    </div>
  );
};

const SettingsPage = () => {
  return (
    <section className="px-0 py-1 lg:py-2">
      <SectionHeader
        title="Workspace settings"
        description="Shape who has access to the workspace, how billing behaves, and how collaborators move through the same recruiting surface."
      />

      <Suspense fallback={<SettingsGateSkeleton />}>
        <SettingsPageContent />
      </Suspense>
    </section>
  );
};

export default SettingsPage;
