import { ArrowRight, Lock, Sparkles } from "lucide-react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { RouteLoadingFallback } from "@/components/navigation/RouteLoadingFallback";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";

type PlaceholderViewState = "default" | "restricted" | "loading";

type ModuleDemoState = {
  description: string;
  title: string;
};

type ModulePlaceholderPageProps = {
  demoState?: ModuleDemoState;
  description: string;
  emptyDescription: string;
  emptyTitle: string;
  kicker: string;
  ownerBranch: string;
  plannedCapabilities: string[];
  state?: PlaceholderViewState;
  title: string;
};

const getPlaceholderViewState = (
  state?: string,
): PlaceholderViewState => {
  if (state === "restricted" || state === "loading") {
    return state;
  }

  return "default";
};

const ModulePlaceholderPage = ({
  demoState,
  description,
  emptyDescription,
  emptyTitle,
  kicker,
  ownerBranch,
  plannedCapabilities,
  state = "default",
  title,
}: ModulePlaceholderPageProps) => {
  if (state === "loading") {
    return (
      <RouteLoadingFallback
        kicker={kicker}
        title={`Loading ${title.toLowerCase()}`}
        description={`Preparing the ${title.toLowerCase()} shell so the next module route keeps the same workspace context.`}
        cardTitle={`Preparing ${title.toLowerCase()}`}
        cardDescription="Syncing the shared foundation shell, route state, and placeholder content."
        rows={4}
      />
    );
  }

  if (state === "restricted") {
    return (
      <section className="space-y-6 px-0 py-1 lg:py-2">
        <div className="space-y-3">
          <span className="inline-kicker">{kicker}</span>
          <h1 className="text-balance text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            This route is already attached to the shared shell, but the current
            role does not have access to the next action yet.
          </p>
        </div>

        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-[1rem] border border-border/70 bg-surface-1">
                <Lock className="size-4 text-foreground" />
              </span>
              Restricted state
            </CardTitle>
            <CardDescription>
              Shared copy for permissions-sensitive module placeholders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[1.5rem] border border-border/70 bg-surface-1/75 p-5">
              <p className="text-sm font-medium text-foreground">
                Access to {title.toLowerCase()} is intentionally limited until
                the owning branch wires the real permissions and actions.
              </p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                The downstream owner for this surface is{" "}
                <span className="font-medium text-foreground">{ownerBranch}</span>.
              </p>
            </div>

            <Button asChild className="rounded-full">
              <TrackedLink href="/dashboard">
                Return to dashboard
                <ArrowRight className="size-4" />
              </TrackedLink>
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <div className="space-y-3">
        <span className="inline-kicker">{kicker}</span>
        <h1 className="text-balance text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>{demoState?.title ?? emptyTitle}</CardTitle>
            <CardDescription>
              {demoState
                ? "Shared seeded-state treatment for workspace demo verification."
                : "Shared empty-state treatment for unfinished business modules."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div
              className={
                demoState
                  ? "rounded-[1.75rem] border border-border/70 bg-surface-1/80 px-6 py-8"
                  : "rounded-[1.75rem] border border-dashed border-border/70 bg-surface-1/60 px-6 py-12 text-center"
              }
            >
              <div
                className={
                  demoState
                    ? "flex size-14 items-center justify-center rounded-[1.35rem] border border-border/70 bg-background/70"
                    : "mx-auto flex size-14 items-center justify-center rounded-[1.35rem] border border-border/70 bg-background/70"
                }
              >
                <Sparkles className="size-5 text-foreground" />
              </div>
              <h2 className="mt-5 text-lg font-semibold tracking-[-0.03em] text-foreground">
                {demoState?.title ?? emptyTitle}
              </h2>
              <p
                className={
                  demoState
                    ? "mt-3 max-w-xl text-sm leading-6 text-muted-foreground"
                    : "mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground"
                }
              >
                {demoState?.description ?? emptyDescription}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-border/70 bg-surface-1/75 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                QA hint
              </p>
              <p className="mt-3 text-sm leading-6 text-foreground">
                Append <code>?state=restricted</code> or{" "}
                <code>?state=loading</code> to this route to manually validate
                the shared restricted and loading states.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Downstream handoff</CardTitle>
            <CardDescription>
              Foundation stabilizes the entry point and the empty-state copy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[1.5rem] border border-border/70 bg-surface-1/75 p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Owning branch
              </p>
              <p className="mt-3 text-sm font-medium text-foreground">
                {ownerBranch}
              </p>
            </div>

            <div className="space-y-3">
              {plannedCapabilities.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.5rem] border border-border/70 bg-surface-1/75 px-4 py-4"
                >
                  <p className="text-sm leading-6 text-foreground">{item}</p>
                </div>
              ))}
            </div>

            <Button asChild className="rounded-full">
              <TrackedLink href="/dashboard">
                Back to dashboard
                <ArrowRight className="size-4" />
              </TrackedLink>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

const NoWorkspaceState = () => {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 pb-10 pt-10 sm:px-6 lg:px-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>No workspace available yet</CardTitle>
          <CardDescription>
            The protected route guard is working, but this account does not have
            a workspace context to attach to yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm leading-6 text-muted-foreground">
            Once sign-up, invitation acceptance, and seeded memberships are all
            aligned, this surface will resolve automatically into the shared
            business shell.
          </p>
          <Button asChild className="rounded-full">
            <TrackedLink href="/sign-up">
              Create a workspace
              <ArrowRight className="size-4" />
            </TrackedLink>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
};

export {
  ModulePlaceholderPage,
  NoWorkspaceState,
  getPlaceholderViewState,
  type ModuleDemoState,
  type PlaceholderViewState,
};
