import { Check, Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { checkoutAction } from "@/lib/payments/actions";
import { getStripePrices, getStripeProducts } from "@/lib/payments/stripe";

import { SubmitButton } from "./submit-button";

export const revalidate = 3600;

const PricingPage = async () => {
  const [prices, products] = await Promise.all([
    getStripePrices(),
    getStripeProducts(),
  ]);

  const basePlan = products.find((product) => product.name === "Base");
  const plusPlan = products.find((product) => product.name === "Plus");
  const basePrice = prices.find((price) => price.productId === basePlan?.id);
  const plusPrice = prices.find((price) => price.productId === plusPlan?.id);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-[4.5rem] pt-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-kicker">Plans & billing</span>
        <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.05em] text-foreground sm:text-5xl">
          Choose the surface that fits your hiring cadence.
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
          Both plans share the same workspace shell, permissions foundation,
          and recruiting flow. Upgrade when you need more support and earlier
          access.
        </p>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <PricingCard
          name={basePlan?.name || "Base"}
          description={basePlan?.description || "A calm start for lean teams."}
          price={basePrice?.unitAmount || 800}
          interval={basePrice?.interval || "month"}
          trialDays={basePrice?.trialPeriodDays || 7}
          features={[
            "Unlimited usage",
            "Unlimited workspace members",
            "Email support",
          ]}
          priceId={basePrice?.id}
        />
        <PricingCard
          name={plusPlan?.name || "Plus"}
          description={
            plusPlan?.description || "Priority support and earlier product depth."
          }
          price={plusPrice?.unitAmount || 1200}
          interval={plusPrice?.interval || "month"}
          trialDays={plusPrice?.trialPeriodDays || 7}
          features={[
            "Everything in Base",
            "Early access to new features",
            "24/7 support and Slack access",
          ]}
          priceId={plusPrice?.id}
          featured
        />
      </div>
    </main>
  );
};

type PricingCardProps = {
  name: string;
  description: string;
  price: number;
  interval: string;
  trialDays: number;
  features: string[];
  priceId?: string;
  featured?: boolean;
};

const PricingCard = ({
  name,
  description,
  price,
  interval,
  trialDays,
  features,
  priceId,
  featured = false,
}: PricingCardProps) => {
  return (
    <Card
      className={cn(
        "h-full rounded-[2rem]",
        featured &&
          "border-foreground/10 bg-foreground text-background before:bg-none"
      )}
    >
      <CardHeader className="gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className={cn("text-3xl tracking-[-0.04em]", featured && "text-background")}>
              {name}
            </CardTitle>
            <CardDescription
              className={cn(
                "mt-2 text-sm leading-6",
                featured ? "text-background/70" : "text-muted-foreground"
              )}
            >
              {description}
            </CardDescription>
          </div>
          {featured ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/[0.82]">
              <Sparkles className="size-3.5" />
              Featured
            </span>
          ) : null}
        </div>
      </CardHeader>

      <CardContent>
        <p className={cn("text-5xl font-semibold tracking-[-0.06em]", featured && "text-background")}>
          ${price / 100}
          <span
            className={cn(
              "ml-2 text-lg font-normal tracking-normal",
              featured ? "text-background/60" : "text-muted-foreground"
            )}
          >
            per member / {interval}
          </span>
        </p>
        <p
          className={cn(
            "mt-3 text-sm",
            featured ? "text-background/70" : "text-muted-foreground"
          )}
        >
          Includes a {trialDays}-day free trial.
        </p>

        <ul className="mt-8 space-y-3">
          {features.map((feature) => (
            <li
              key={feature}
              className={cn(
                "flex items-start gap-3 rounded-[1.25rem] border px-4 py-3",
                featured
                  ? "border-white/10 bg-white/[0.06] text-background/92"
                  : "border-border/70 bg-surface-1/75 text-foreground"
              )}
            >
              <Check
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  featured ? "text-background" : "text-foreground"
                )}
              />
              <span className="text-sm leading-6">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <form action={checkoutAction} className="w-full">
          <input type="hidden" name="priceId" value={priceId} />
          <SubmitButton
            variant={featured ? "secondary" : "default"}
            className={cn(featured && "border-white/15 bg-background text-foreground hover:bg-background/92")}
          />
        </form>
      </CardFooter>
    </Card>
  );
};

export default PricingPage;
