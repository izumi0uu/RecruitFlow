"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { type FormEvent, Suspense } from "react";

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
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { getFormString } from "@/lib/form-data";
import { currentUserQueryOptions } from "@/lib/query/options";

import { useAccountUpdateMutation } from "../hooks/useAccountSettingsMutations";

type AccountFormProps = {
  nameValue?: string;
  emailValue?: string;
  isPending?: boolean;
};

const AccountForm = ({
  nameValue = "",
  emailValue = "",
  isPending = false,
}: AccountFormProps) => {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Enter your name"
          defaultValue={nameValue}
          required
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email"
          defaultValue={emailValue}
          required
          disabled={isPending}
        />
      </div>
    </>
  );
};

const AccountSettingsForm = () => {
  const { data: user } = useSuspenseQuery(currentUserQueryOptions());
  const { error, isPending, saveAccount, success } = useAccountUpdateMutation();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    saveAccount({
      email: getFormString(formData, "email"),
      name: getFormString(formData, "name"),
    });
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <AccountForm
        emailValue={user?.email ?? ""}
        isPending={isPending}
        nameValue={user?.name ?? ""}
      />

      {error ? <p className="status-message status-error">{error}</p> : null}
      {success ? (
        <p className="status-message status-success">{success}</p>
      ) : null}

      <Button type="submit" className="rounded-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save changes"
        )}
      </Button>
    </form>
  );
};

const GeneralPage = () => {
  return (
    <section className="flex h-full min-h-0 flex-col gap-5 px-0 py-1 lg:py-0">
      <WorkspacePageHeader
        kicker="Account details"
        title="General settings"
        description="Keep your workspace identity current so collaborators always know who owns the next decision."
      />

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Account information</CardTitle>
          <CardDescription>
            Update the identity details that appear throughout the workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<AccountForm />}>
            <AccountSettingsForm />
          </Suspense>
        </CardContent>
      </Card>
    </section>
  );
};

export default GeneralPage;
