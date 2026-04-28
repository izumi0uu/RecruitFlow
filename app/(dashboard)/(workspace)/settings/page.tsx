"use client";

import { forwardRef, Suspense, useActionState, useEffect } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  CreditCard,
  Loader2,
  PlusCircle,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { motion, type HTMLMotionProps } from "motion/react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/RadioGroup";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { customerPortalAction } from "@/lib/payments/actions";
import {
  currentUserQueryOptions,
  currentWorkspaceQueryOptions,
  workspaceQueryKey,
} from "@/lib/query/options";
import type { CurrentUserDto } from "@/lib/query/types";
import { cn } from "@/lib/utils";

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
    <Card className="h-full min-h-0">
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
      <Card className="h-full min-h-0">
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
    <Card className="h-full min-h-0">
      <CardHeader>
        <CardTitle>Workspace members</CardTitle>
        <CardDescription>
          See who currently has access to this workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
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

const inviteRoleOptions = [
  {
    id: "coordinator",
    value: "coordinator",
    label: "Coordinator",
    description:
      "Keeps follow-ups, scheduling, and shared workflow details moving.",
  },
  {
    id: "recruiter",
    value: "recruiter",
    label: "Recruiter",
    description:
      "Owns candidate flow, client updates, and day-to-day recruiting work.",
  },
  {
    id: "owner",
    value: "owner",
    label: "Owner",
    description: "Can manage billing, roles, and workspace-wide settings.",
  },
];

const InviteTeamMemberForm = ({ isOwner }: { isOwner: boolean }) => {
  const [inviteState, inviteAction, isInvitePending] = useActionState<
    ActionState,
    FormData
  >(inviteTeamMember, {});

  return (
    <>
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
            className="grid gap-3 md:grid-cols-3"
            disabled={!isOwner}
          >
            {inviteRoleOptions.map((option) => (
              <div
                key={option.id}
                className="rounded-[1.5rem] border border-border/70 bg-surface-1/75 p-4"
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem
                    value={option.value}
                    id={option.id}
                    className="mt-1 cursor-pointer"
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
          <p className="status-message status-success">{inviteState.success}</p>
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

      {!isOwner ? (
        <p className="text-sm leading-6 text-muted-foreground">
          Only workspace owners can invite new teammates.
        </p>
      ) : null}
    </>
  );
};

const compactActionTextVariants = {
  rest: {
    opacity: 0,
    width: 0,
  },
  reveal: {
    opacity: 1,
    width: "auto",
  },
};

const compactActionTransition = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1],
} as const;

type CompactWorkspaceActionProps = HTMLMotionProps<"button"> & {
  icon: LucideIcon;
  title: string;
};

const CompactWorkspaceAction = forwardRef<
  HTMLButtonElement,
  CompactWorkspaceActionProps
>(
  (
    { className, disabled, icon: Icon, title, type = "button", ...props },
    ref,
  ) => {
    return (
      <motion.button
        ref={ref}
        type={type}
        aria-label={title}
        disabled={disabled}
        initial="rest"
        whileHover={disabled ? "rest" : "reveal"}
        whileFocus={disabled ? "rest" : "reveal"}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        layout
        transition={compactActionTransition}
        className={cn(
          "group/action inline-flex h-12 min-w-12 max-w-full cursor-pointer items-center overflow-hidden rounded-[1.05rem] border border-border/70 bg-background/72 px-2.5 text-left text-foreground shadow-[0_16px_42px_-34px_var(--shadow-color)] backdrop-blur-sm transition-colors hover:border-foreground/15 hover:bg-surface-1 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-45",
          className,
        )}
        {...props}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-[0.75rem] bg-surface-2/70 text-foreground transition-colors group-hover/action:bg-foreground group-hover/action:text-background">
          <Icon className="size-4" />
        </span>
        <motion.span
          variants={compactActionTextVariants}
          transition={compactActionTransition}
          className="min-w-0 overflow-hidden whitespace-nowrap"
        >
          <span className="ml-3 block text-sm font-semibold leading-none">
            {title}
          </span>
        </motion.span>
      </motion.button>
    );
  },
);

CompactWorkspaceAction.displayName = "CompactWorkspaceAction";

const CompactWorkspaceActionMarker = ({
  icon: Icon,
  title,
}: {
  icon: LucideIcon;
  title: string;
}) => {
  return (
    <motion.div
      aria-disabled="true"
      role="img"
      aria-label={title}
      initial="rest"
      whileHover="reveal"
      whileFocus="reveal"
      layout
      transition={compactActionTransition}
      tabIndex={0}
      className="group/action inline-flex h-12 min-w-12 max-w-full cursor-pointer items-center overflow-hidden rounded-[1.05rem] border border-dashed border-border/70 bg-surface-1/48 px-2.5 text-left text-muted-foreground transition-colors hover:border-border hover:bg-surface-1/75 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-[0.75rem] bg-background/70 text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <motion.span
        variants={compactActionTextVariants}
        transition={compactActionTransition}
        className="min-w-0 overflow-hidden whitespace-nowrap"
      >
        <span className="ml-3 block text-sm font-semibold leading-none text-foreground">
          {title}
        </span>
      </motion.span>
    </motion.div>
  );
};

const WorkspaceActionsDock = ({ isOwner }: { isOwner: boolean }) => {
  return (
    <div className="flex flex-col items-start gap-2 xl:items-end">
      <div className="flex min-h-12 flex-wrap items-center gap-2 xl:justify-end">
        <Dialog>
          <DialogTrigger asChild>
            <CompactWorkspaceAction
              disabled={!isOwner}
              icon={UsersRound}
              title="Invite member"
            />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite member</DialogTitle>
              <DialogDescription>
                Add another member when the workspace is ready for more hands.
              </DialogDescription>
            </DialogHeader>
            <InviteTeamMemberForm isOwner={isOwner} />
          </DialogContent>
        </Dialog>

        <CompactWorkspaceActionMarker icon={ShieldCheck} title="Role audit" />
        <CompactWorkspaceActionMarker
          icon={CreditCard}
          title="Billing handoff"
        />
      </div>

      {!isOwner ? (
        <p className="max-w-56 text-xs leading-5 text-muted-foreground xl:text-right">
          Only owners can use invitation actions.
        </p>
      ) : null}
    </div>
  );
};

const SettingsGateSkeleton = () => {
  return (
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
        <SubscriptionSkeleton />
        <TeamMembersSkeleton />
      </div>
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

      {!isOwner ? (
        <SettingsRestrictedState />
      ) : (
        <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-2">
          <Suspense fallback={<SubscriptionSkeleton />}>
            <ManageSubscription />
          </Suspense>
          <Suspense fallback={<TeamMembersSkeleton />}>
            <TeamMembers />
          </Suspense>
        </div>
      )}
    </div>
  );
};

const SettingsPage = () => {
  return (
    <section className="h-full min-h-0 px-0 py-1 lg:py-0">
      <Suspense fallback={<SettingsGateSkeleton />}>
        <SettingsPageContent />
      </Suspense>
    </section>
  );
};

export default SettingsPage;
