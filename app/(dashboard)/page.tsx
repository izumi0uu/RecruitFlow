import {
  ArrowRight,
  BriefcaseBusiness,
  Gauge,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";

import { Terminal } from "./terminal";

const featureCards = [
  {
    icon: BriefcaseBusiness,
    title: "Pipeline clarity",
    description:
      "Track roles, candidates, and stage movement inside a single calm surface built for hiring teams.",
  },
  {
    icon: MessagesSquare,
    title: "Shared context",
    description:
      "Capture notes, async feedback, and follow-ups without turning every decision into another tab.",
  },
  {
    icon: ShieldCheck,
    title: "Controlled access",
    description:
      "Run recruiting ops with clean permissions, workspace isolation, and subscription-aware admin flows.",
  },
];

const proofPoints = [
  { value: "24h", label: "From workspace setup to live review flow" },
  {
    value: "1 place",
    label: "For jobs, candidates, billing, and workspace actions",
  },
  { value: "0 noise", label: "A calmer visual system for operational work" },
];

const HomePage = () => {
  return (
    <main className="overflow-hidden">
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pb-24 lg:pt-[4.5rem]">
        <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-8">
            <span className="inline-kicker">Monochrome recruiting workspace</span>
            <div className="space-y-5">
              <h1 className="text-balance text-5xl font-semibold tracking-[-0.06em] text-foreground sm:text-6xl lg:text-7xl">
                Turn hiring operations into a surface that feels precise.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                RecruitFlow combines recruiting workflow, workspace
                collaboration,
                and billing-ready SaaS primitives inside one calm grayscale
                system designed for daily use.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-full px-6">
                <TrackedLink href="/sign-up">
                  Open a workspace
                  <ArrowRight className="size-4" />
                </TrackedLink>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-6">
                <TrackedLink href="/pricing">See plans</TrackedLink>
              </Button>
            </div>

            <dl className="grid gap-3 sm:grid-cols-3">
              {proofPoints.map((item) => (
                <div key={item.label} className="panel-shell rounded-[1.5rem] px-4 py-4">
                  <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative lg:pl-6">
            <div className="absolute -left-8 top-6 hidden h-24 w-24 rounded-full bg-white/50 blur-3xl dark:bg-white/[0.08] lg:block" />
            <div className="panel-shell rounded-[2rem] p-3 sm:p-4">
              <div className="mb-4 flex items-center justify-between border-b border-border/60 px-3 pb-4 pt-1">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Live workspace preview
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    A darker, steadier operating surface
                  </p>
                </div>
                <span className="rounded-full border border-border/70 bg-surface-1 px-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Demo
                </span>
              </div>
              <Terminal />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="mb-8 max-w-2xl space-y-3">
          <span className="inline-kicker">Built for daily decision making</span>
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
            The product surface should feel quieter than the work inside it.
          </h2>
          <p className="text-base leading-7 text-muted-foreground">
            The interface is intentionally monochrome so candidate motion,
            comments, and ownership changes stand out without visual clutter.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {featureCards.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="panel-shell rounded-[1.75rem] px-5 py-6"
              >
                <div className="flex size-12 items-center justify-center rounded-[1.25rem] border border-border/70 bg-surface-1">
                  <Icon className="size-5 text-foreground" />
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="panel-shell rounded-[2rem] px-6 py-8">
            <span className="inline-kicker">Recruiting rhythm</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-foreground">
              Stay inside one loop from intake to decision.
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: "Capture",
                  copy: "Create roles, import candidates, and centralize intake signals.",
                },
                {
                  title: "Review",
                  copy: "Keep notes, approvals, and role ownership in one place.",
                },
                {
                  title: "Decide",
                  copy: "Move faster with a cleaner view of status, activity, and plan usage.",
                },
              ].map((step) => (
                <div
                  key={step.title}
                  className="rounded-[1.5rem] border border-border/70 bg-surface-1/80 p-4"
                >
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {step.title}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-foreground">{step.copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-shell rounded-[2rem] px-6 py-8">
            <div className="flex size-12 items-center justify-center rounded-[1.2rem] border border-border/70 bg-surface-1">
              <Gauge className="size-5 text-foreground" />
            </div>
            <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-foreground">
              A premium shell, backed by real SaaS mechanics.
            </h3>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Auth, workspaces, subscriptions, audit-friendly activity, and
              async
              workspace state are already part of the foundation.
            </p>
            <div className="mt-8 space-y-3">
              {[
                "Multi-tenant workspace foundations",
                "Stripe-backed plan and seat flows",
                "A dashboard shell ready for workspace workflows",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-[1.35rem] border border-border/70 bg-surface-1/75 px-4 py-3"
                >
                  <Sparkles className="mt-0.5 size-4 text-foreground" />
                  <p className="text-sm text-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-[4.5rem] sm:px-6 lg:px-8">
        <div className="panel-shell rounded-[2.2rem] px-6 py-10 sm:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <span className="inline-kicker">Ready to move</span>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
                Start with a lighter surface, then shift into graphite when the
                workspace settles in.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                The whole product now shares the same grayscale system, so
                marketing, auth, and settings feel like one continuous product.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-6">
                <TrackedLink href="/dashboard">
                  Open dashboard
                  <ArrowRight className="size-4" />
                </TrackedLink>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-6">
                <TrackedLink href="/pricing">Review pricing</TrackedLink>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default HomePage;
