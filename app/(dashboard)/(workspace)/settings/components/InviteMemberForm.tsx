"use client";

import { type FormEvent, useRef } from "react";
import { Loader2, PlusCircle } from "lucide-react";

import type { ApiWorkspaceRole } from "@recruitflow/contracts";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/RadioGroup";
import { getFormString } from "@/lib/form-data";

import { useWorkspaceMemberInviteMutation } from "./hooks/useWorkspaceMemberMutations";

type InviteRoleOption = {
  description: string;
  id: ApiWorkspaceRole;
  label: string;
  value: ApiWorkspaceRole;
};

const inviteRoleOptions: InviteRoleOption[] = [
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

const InviteMemberForm = ({ isOwner }: { isOwner: boolean }) => {
  const formRef = useRef<HTMLFormElement>(null);
  const {
    error,
    inviteMember,
    isPending: isInvitePending,
    success,
  } = useWorkspaceMemberInviteMutation({
    onSuccess: () => {
      formRef.current?.reset();
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    inviteMember({
      email: getFormString(formData, "email"),
      role: getFormString(formData, "role"),
    });
  };

  return (
    <>
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="name@company.com"
            required
            disabled={!isOwner || isInvitePending}
          />
        </div>

        <div className="space-y-3">
          <Label>Role</Label>
          <RadioGroup
            defaultValue="coordinator"
            name="role"
            className="grid gap-3 md:grid-cols-3"
            disabled={!isOwner || isInvitePending}
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
                      className="text-sm font-medium normal-case tracking-normal text-foreground"
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

        {error ? (
          <p className="status-message status-error">{error}</p>
        ) : null}
        {success ? (
          <p className="status-message status-success">{success}</p>
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

export { InviteMemberForm };
