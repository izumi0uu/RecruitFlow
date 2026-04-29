"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import {
  ArrowRight,
  Loader2,
  ShieldCheck,
  Sparkles,
  Workflow,
} from "lucide-react";

import { BrandLockup } from "@/components/Brand";
import { TrackedLink } from "@/components/navigation/TrackedLink";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

import { signIn, signUp } from "./actions";

type AuthActionState = {
  error?: string;
  email?: string;
  password?: string;
  success?: string;
  [key: string]: string | undefined;
};

const leftColumnPoints = [
  {
    icon: Workflow,
    title: "Steady recruiting flow",
    copy: "Move from job creation to candidate review without leaving the same workspace surface.",
  },
  {
    icon: Sparkles,
    title: "A quieter UI",
    copy: "The new grayscale system keeps attention on decisions instead of decoration.",
  },
  {
    icon: ShieldCheck,
    title: "Ready for workspace ops",
    copy: "Permissions, billing, and member controls are already built into the foundation.",
  },
];

export const Login = ({ mode = "signin" }: { mode?: "signin" | "signup" }) => {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const priceId = searchParams.get("priceId");
  const inviteId = searchParams.get("inviteId");
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    mode === "signin" ? signIn : signUp,
    { error: "" },
  );

  const alternateBasePath = mode === "signin" ? "/sign-up" : "/sign-in";
  const alternateParams = new URLSearchParams();

  if (redirect) alternateParams.set("redirect", redirect);

  if (priceId) alternateParams.set("priceId", priceId);

  if (inviteId) alternateParams.set("inviteId", inviteId);

  const alternateHref = alternateParams.toString()
    ? `${alternateBasePath}?${alternateParams.toString()}`
    : alternateBasePath;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="grid min-h-[100dvh] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden border-r border-border/70 lg:flex">
          <div className="mx-auto flex w-full max-w-xl flex-col justify-between px-8 py-10 xl:px-12">
            <BrandLockup />

            <div className="space-y-8">
              <div className="space-y-4">
                <span className="inline-kicker">
                  Monochrome recruiting workspace
                </span>
                <h1 className="text-balance text-5xl font-semibold tracking-[-0.06em] text-foreground">
                  Build a calmer hiring surface for your workspace.
                </h1>
                <p className="text-base leading-7 text-muted-foreground">
                  RecruitFlow gives workspaces, candidate reviews, and admin
                  controls a sharper visual rhythm without changing the business
                  flow underneath.
                </p>
              </div>

              <div className="grid gap-4">
                {leftColumnPoints.map((item) => {
                  const Icon = item.icon;

                  return (
                    <article
                      key={item.title}
                      className="panel-shell rounded-[1.75rem] px-5 py-5"
                    >
                      <div className="flex size-11 items-center justify-center rounded-[1.15rem] border border-border/70 bg-surface-1">
                        <Icon className="size-[1.125rem] text-foreground" />
                      </div>
                      <h2 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-foreground">
                        {item.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {item.copy}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Light mode feels like paper. Dark mode settles into graphite.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-[4.5rem] sm:px-6 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <BrandLockup />
            </div>

            <div className="panel-shell rounded-[2rem] p-6 sm:p-8">
              <div className="space-y-4">
                <span className="inline-kicker">
                  {mode === "signin" ? "Welcome back" : "Open your workspace"}
                </span>
                <div className="space-y-2">
                  <h2 className="text-3xl font-semibold tracking-[-0.05em] text-foreground">
                    {mode === "signin"
                      ? "Resume your recruiting flow."
                      : "Create a workspace that feels intentional."}
                  </h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {mode === "signin"
                      ? "Sign in to continue reviewing candidates, activity, and billing settings."
                      : "Create your account and start running hiring from a calmer, more deliberate interface."}
                  </p>
                </div>
              </div>

              <form className="mt-8 space-y-5" action={formAction}>
                <input type="hidden" name="redirect" value={redirect || ""} />
                <input type="hidden" name="priceId" value={priceId || ""} />
                <input type="hidden" name="inviteId" value={inviteId || ""} />

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    defaultValue={state.email}
                    required
                    maxLength={50}
                    className="h-12"
                    placeholder="name@company.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    defaultValue={state.password}
                    required
                    minLength={8}
                    maxLength={100}
                    className="h-12"
                    placeholder="Enter your password"
                  />
                </div>

                {state?.error ? (
                  <p className="status-message status-error">{state.error}</p>
                ) : null}

                <Button
                  type="submit"
                  className="cursor-pointer h-12 w-full justify-center rounded-2xl"
                  disabled={pending}
                >
                  {pending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Loading...
                    </>
                  ) : mode === "signin" ? (
                    <>
                      Sign in
                      <ArrowRight className="size-4" />
                    </>
                  ) : (
                    <>
                      Sign up
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-8">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border/70" />
                  <span className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {mode === "signin" ? "New here" : "Already joined"}
                  </span>
                  <div className="h-px flex-1 bg-border/70" />
                </div>

                <Button
                  asChild
                  variant="outline"
                  className="mt-6 h-12 w-full rounded-2xl"
                >
                  <TrackedLink href={alternateHref}>
                    {mode === "signin"
                      ? "Create an account"
                      : "Sign in to existing account"}
                  </TrackedLink>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
