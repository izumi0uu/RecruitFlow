"use client";

import {
  type ApiWorkspaceRole,
  apiWorkspaceRoleValues,
} from "@recruitflow/contracts";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Loader2, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

import {
  useWorkspaceMemberRemoveMutation,
  useWorkspaceMemberRoleUpdateMutation,
} from "./hooks/useWorkspaceMemberMutations";

type UserIdentity = Pick<NonNullable<CurrentUserDto>, "name" | "email">;

type WorkspaceMemberListItem = {
  id: string;
  joinedAt: string | null;
  role: ApiWorkspaceRole;
  user: UserIdentity;
  userId: string;
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

const toRoleLabel = (role: ApiWorkspaceRole) => {
  return role.charAt(0).toUpperCase() + role.slice(1);
};

const formatJoinedAt = (joinedAt?: string | null) => {
  if (!joinedAt) {
    return "Invitation pending";
  }

  const formattedDate = new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(joinedAt));

  return `Joined ${formattedDate}`;
};

type MemberRoleControlProps = {
  isOwner: boolean;
  member: WorkspaceMemberListItem;
  ownerCount: number;
};

const MemberRoleControl = ({
  isOwner,
  member,
  ownerCount,
}: MemberRoleControlProps) => {
  const [role, setRole] = useState<ApiWorkspaceRole>(member.role);
  const {
    error,
    isPending,
    success,
    updateMemberRole,
    variables: pendingVariables,
  } = useWorkspaceMemberRoleUpdateMutation({
    onSuccess: (response) => {
      setRole(response.member.role);
    },
  });
  const isDirty = role !== member.role;
  const isLastOwnerDemotion =
    member.role === "owner" && role !== "owner" && ownerCount <= 1;
  const isSavingThisMember = pendingVariables?.memberId === member.id;

  useEffect(() => {
    setRole(member.role);
  }, [member.role]);

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        updateMemberRole({ memberId: member.id, role });
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <label className="sr-only" htmlFor={`member-role-${member.id}`}>
          Role for {getUserDisplayName(member.user)}
        </label>
        <select
          id={`member-role-${member.id}`}
          className="input h-10 min-w-36"
          value={role}
          disabled={!isOwner || isPending}
          onChange={(event) => {
            setRole(event.target.value as ApiWorkspaceRole);
          }}
        >
          {apiWorkspaceRoleValues.map((nextRole) => (
            <option key={nextRole} value={nextRole}>
              {toRoleLabel(nextRole)}
            </option>
          ))}
        </select>

        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={!isOwner || !isDirty || isPending || isLastOwnerDemotion}
        >
          {isPending && isSavingThisMember ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save role
            </>
          )}
        </Button>
      </div>

      {isLastOwnerDemotion ? (
        <p className="text-xs leading-5 text-muted-foreground">
          Add another owner before changing this owner role.
        </p>
      ) : null}
      {error ? <p className="status-message status-error">{error}</p> : null}
      {success ? (
        <p className="status-message status-success">{success}</p>
      ) : null}
    </form>
  );
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
  const ownerCount = useMemo(() => {
    return (
      workspaceData?.memberships?.filter((member) => member.role === "owner")
        .length ?? 0
    );
  }, [workspaceData?.memberships]);
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
          {workspaceData.memberships.map((member) => {
            const isCurrentUser = member.userId === user?.id;
            const isLastOwner = member.role === "owner" && ownerCount <= 1;
            const canRemove = isOwner && !isCurrentUser && !isLastOwner;

            return (
              <li
                key={member.id}
                className="flex flex-col gap-4 rounded-[1.5rem] border border-border/70 bg-surface-1/70 px-4 py-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <Avatar className="size-11">
                      <AvatarFallback>
                        {getUserInitials(member.user)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {getUserDisplayName(member.user)}
                      </p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {member.user.email}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="status-message border-border/70 bg-background text-muted-foreground">
                          {toRoleLabel(member.role)}
                        </span>
                        <span>{formatJoinedAt(member.joinedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {isOwner ? (
                    <div className="flex flex-col gap-3 lg:items-end">
                      <MemberRoleControl
                        isOwner={isOwner}
                        member={member}
                        ownerCount={ownerCount}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        disabled={!canRemove || isRemovePending}
                        onClick={() => {
                          removeMember(member.id);
                        }}
                      >
                        {isRemovePending && pendingMemberId === member.id ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Removing...
                          </>
                        ) : (
                          <>
                            <Trash2 className="size-4" />
                            {isCurrentUser
                              ? "Current user"
                              : isLastOwner
                                ? "Last owner"
                                : "Remove"}
                          </>
                        )}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
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
