"use client";

import { useActionState } from "react";
import { Loader2, Lock, Trash2 } from "lucide-react";

import { deleteAccount, updatePassword } from "@/app/(login)/actions";
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

type PasswordState = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  error?: string;
  success?: string;
};

type DeleteState = {
  password?: string;
  error?: string;
  success?: string;
};

const SecurityPage = () => {
  const [passwordState, passwordAction, isPasswordPending] = useActionState<
    PasswordState,
    FormData
  >(updatePassword, {});
  const [deleteState, deleteAction, isDeletePending] = useActionState<
    DeleteState,
    FormData
  >(deleteAccount, {});

  return (
    <section className="flex h-full min-h-0 flex-col gap-5 px-0 py-1 lg:py-0">
      <WorkspacePageHeader
        kicker="Security"
        title="Security settings"
        description="Keep sign-in details up to date and control what happens when an account should be removed from the workspace entirely."
      />

      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)]">
        <Card className="min-h-0 w-full">
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Rotate your password regularly to keep the workspace secure.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-0 overflow-y-auto">
            <form className="space-y-5" action={passwordAction}>
              <div className="space-y-2">
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  maxLength={100}
                  defaultValue={passwordState.currentPassword}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={100}
                  defaultValue={passwordState.newPassword}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  maxLength={100}
                  defaultValue={passwordState.confirmPassword}
                />
              </div>

              {passwordState.error ? (
                <p className="status-message status-error">
                  {passwordState.error}
                </p>
              ) : null}
              {passwordState.success ? (
                <p className="status-message status-success">
                  {passwordState.success}
                </p>
              ) : null}

              <Button
                type="submit"
                className="rounded-full"
                disabled={isPasswordPending}
              >
                {isPasswordPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Lock className="size-4" />
                    Update password
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="min-h-0 w-full border-destructive/20">
          <CardHeader>
            <CardTitle>Delete account</CardTitle>
            <CardDescription>
              Account deletion is irreversible. Proceed only if the workspace no
              longer needs this identity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={deleteAction} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="delete-password">Confirm password</Label>
                <Input
                  id="delete-password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={100}
                  defaultValue={deleteState.password}
                />
              </div>

              {deleteState.error ? (
                <p className="status-message status-error">
                  {deleteState.error}
                </p>
              ) : null}

              <Button
                type="submit"
                variant="destructive"
                className="rounded-full"
                disabled={isDeletePending}
              >
                {isDeletePending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" />
                    Delete account
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default SecurityPage;
