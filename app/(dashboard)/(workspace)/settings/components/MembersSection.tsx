"use client";

import { useSuspenseQuery } from "@tanstack/react-query";

import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  currentUserQueryOptions,
  currentWorkspaceQueryOptions,
} from "@/lib/query/options";
import type { CurrentUserDto } from "@/lib/query/types";

import { useWorkspaceMemberRemoveMutation } from "./hooks/useWorkspaceMemberMutations";

type UserIdentity = Pick<NonNullable<CurrentUserDto>, "name" | "email">;

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

const MembersSectionSkeleton = () => (
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

const MembersSection = () => {
  const { data: user } = useSuspenseQuery(currentUserQueryOptions());
  const { data: workspaceData } = useSuspenseQuery(
    currentWorkspaceQueryOptions(),
  );
  const isOwner = user?.role === "owner";
  const {
    error,
    isPending: isRemovePending,
    removeMember,
    success,
    variables: pendingMemberId,
  } = useWorkspaceMemberRemoveMutation();

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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  disabled={isRemovePending}
                  onClick={() => {
                    removeMember(member.id);
                  }}
                >
                  {isRemovePending && pendingMemberId === member.id
                    ? "Removing..."
                    : "Remove"}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>

        {error ? (
          <p className="status-message status-error mt-5">{error}</p>
        ) : null}
        {success ? (
          <p className="status-message status-success mt-5">{success}</p>
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

export { MembersSection, MembersSectionSkeleton };
