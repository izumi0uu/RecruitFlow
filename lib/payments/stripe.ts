import Stripe from "stripe";
import { redirect } from "next/navigation";

import { getStripeConfig, loadRootEnv } from "@recruitflow/config";

import { Workspace } from "@/lib/db/schema";

loadRootEnv();
const stripeConfig = getStripeConfig();

export const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: "2025-04-30.basil",
});

export const createCustomerPortalSession = async (workspace: Workspace) => {
  if (!workspace.stripeCustomerId || !workspace.stripeProductId) {
    redirect("/pricing");
  }
  let configuration: Stripe.BillingPortal.Configuration;
  const configurations = await stripe.billingPortal.configurations.list();
  if (configurations.data.length > 0) {
    configuration = configurations.data[0];
  } else {
    const product = await stripe.products.retrieve(workspace.stripeProductId);
    if (!product.active) {
      throw new Error("Workspace product is not active in Stripe");
    }
    const prices = await stripe.prices.list({
      product: product.id,
      active: true,
    });
    if (prices.data.length === 0) {
      throw new Error("No active prices found for the workspace product");
    }
    configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: "Manage your subscription",
      },
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ["price", "quantity", "promotion_code"],
          proration_behavior: "create_prorations",
          products: [
            {
              product: product.id,
              prices: prices.data.map((price) => price.id),
            },
          ],
        },
        subscription_cancel: {
          enabled: true,
          mode: "at_period_end",
          cancellation_reason: {
            enabled: true,
            options: [
              "too_expensive",
              "missing_features",
              "switched_service",
              "unused",
              "other",
            ],
          },
        },
        payment_method_update: {
          enabled: true,
        },
      },
    });
  }
  return stripe.billingPortal.sessions.create({
    customer: workspace.stripeCustomerId,
    return_url: `${stripeConfig.baseUrl}/dashboard`,
    configuration: configuration.id,
  });
};
export const getStripePrices = async () => {
  const prices = await stripe.prices.list({
    expand: ["data.product"],
    active: true,
    type: "recurring",
  });
  return prices.data.map((price) => ({
    id: price.id,
    productId:
      typeof price.product === "string" ? price.product : price.product.id,
    unitAmount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval,
    trialPeriodDays: price.recurring?.trial_period_days,
  }));
};
export const getStripeProducts = async () => {
  const products = await stripe.products.list({
    active: true,
    expand: ["data.default_price"],
  });
  return products.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    defaultPriceId:
      typeof product.default_price === "string"
        ? product.default_price
        : product.default_price?.id,
  }));
};
