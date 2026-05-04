"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { getFormString } from "@/lib/form-data";
import {
  currentUserQueryOptions,
  currentWorkspaceQueryOptions,
} from "@/lib/query/options";

import { useWorkspaceProfileUpdateMutation } from "../hooks/useWorkspaceProfileMutation";

const WorkspaceProfileFormSkeleton = () => (
  <form className="space-y-5">
    <div className="space-y-2">
      <Label htmlFor="workspace-name-skeleton">Workspace name</Label>
      <Input id="workspace-name-skeleton" disabled />
    </div>
    <div className="space-y-2">
      <Label htmlFor="workspace-slug-skeleton">Workspace slug</Label>
      <Input id="workspace-slug-skeleton" disabled />
    </div>
    <Button type="button" className="rounded-full" disabled>
      Save workspace
    </Button>
  </form>
);

const WorkspaceProfileForm = () => {
  const { data: user } = useSuspenseQuery(currentUserQueryOptions());
  const { data: workspace } = useSuspenseQuery(currentWorkspaceQueryOptions());
  const isOwner = user?.role === "owner";
  const { error, isPending, saveWorkspaceProfile, success } =
    useWorkspaceProfileUpdateMutation();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    saveWorkspaceProfile({
      name: getFormString(formData, "name"),
      slug: getFormString(formData, "slug"),
    });
  };

  return (
    <form
      key={`${workspace?.id ?? "workspace"}-${workspace?.updatedAt ?? "draft"}`}
      className="space-y-5"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="workspace-name">Workspace name</Label>
          <Input
            id="workspace-name"
            name="name"
            placeholder="Agency workspace"
            defaultValue={workspace?.name ?? ""}
            required
            maxLength={100}
            disabled={!isOwner || isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="workspace-slug">Workspace slug</Label>
          <Input
            id="workspace-slug"
            name="slug"
            placeholder="agency-workspace"
            defaultValue={workspace?.slug ?? ""}
            required
            minLength={3}
            maxLength={120}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            disabled={!isOwner || isPending}
          />
        </div>
      </div>

      {error ? <p className="status-message status-error">{error}</p> : null}
      {success ? (
        <p className="status-message status-success">{success}</p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          type="submit"
          className="rounded-full"
          disabled={!isOwner || isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="size-4" />
              Save workspace
            </>
          )}
        </Button>
        {!isOwner ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Only workspace owners can update workspace identity.
          </p>
        ) : null}
      </div>
    </form>
  );
};

const WorkspaceProfileSection = () => (
  <Card className="w-full max-w-3xl">
    <CardHeader>
      <CardTitle>Workspace profile</CardTitle>
      <CardDescription>
        Update the name and slug used for this workspace.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <WorkspaceProfileForm />
    </CardContent>
  </Card>
);

export { WorkspaceProfileFormSkeleton, WorkspaceProfileSection };
