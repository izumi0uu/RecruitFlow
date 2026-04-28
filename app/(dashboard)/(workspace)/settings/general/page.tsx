"use client";

import { useEffect, Suspense, useActionState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { updateAccount } from "@/app/(login)/actions";
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
import { currentUserQueryOptions, userQueryKey } from "@/lib/query/options";

type ActionState = {
  name?: string;
  error?: string;
  success?: string;
};

type AccountFormProps = {
  state: ActionState;
  nameValue?: string;
  emailValue?: string;
};

const AccountForm = ({
  state,
  nameValue = "",
  emailValue = "",
}: AccountFormProps) => {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="Enter your name"
          defaultValue={state.name || nameValue}
          required
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
        />
      </div>
    </>
  );
};

const AccountFormWithData = ({ state }: { state: ActionState }) => {
  const { data: user } = useSuspenseQuery(currentUserQueryOptions());

  return (
    <AccountForm
      state={state}
      nameValue={user?.name ?? ""}
      emailValue={user?.email ?? ""}
    />
  );
};

const GeneralPage = () => {
  const queryClient = useQueryClient();
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateAccount,
    {},
  );

  useEffect(() => {
    if (!state.success) return;

    queryClient.invalidateQueries({ queryKey: userQueryKey, exact: true });
  }, [queryClient, state]);

  return (
    <section className="flex h-full min-h-0 flex-col gap-5 px-0 py-1 lg:py-0">
      <WorkspacePageHeader
        kicker="Account details"
        title="General settings"
        description="Keep your workspace identity current so collaborators always know who owns the next decision."
      />

      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Account information</CardTitle>
          <CardDescription>
            Update the identity details that appear throughout the workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" action={formAction}>
            <Suspense fallback={<AccountForm state={state} />}>
              <AccountFormWithData state={state} />
            </Suspense>

            {state.error ? (
              <p className="status-message status-error">{state.error}</p>
            ) : null}
            {state.success ? (
              <p className="status-message status-success">{state.success}</p>
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
        </CardContent>
      </Card>
    </section>
  );
};

export default GeneralPage;
