import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

import {
  getStripeConfig,
  loadRootEnv,
} from "@recruitflow/config";
import type {
  BillingCheckoutRequest,
  BillingCheckoutResponse,
  BillingStripeWebhookResponse,
} from "@recruitflow/contracts";

import { db } from "../db/database";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";

import { writeAuditLog } from "@/lib/db/audit";
import {
  AuditAction,
  teams,
} from "@/lib/db/schema";
import { stripe } from "@/lib/payments/stripe";

type StripeWebhookRequest = {
  headers: {
    "stripe-signature"?: string | string[];
  };
  rawBody?: Buffer;
};

type StripeMetadata = {
  actorUserId?: string;
  workspaceId?: string;
};

@Injectable()
export class BillingService {
  private parseMetadataUuid(input: string | undefined) {
    if (!input) {
      return null;
    }

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    return uuidPattern.test(input) ? input : null;
  }

  private async resolveWorkspaceId(
    customerId: string | null,
    metadata: StripeMetadata | null | undefined,
  ) {
    if (customerId) {
      const [workspace] = await db
        .select({ id: teams.id })
        .from(teams)
        .where(eq(teams.stripeCustomerId, customerId))
        .limit(1);

      if (workspace) {
        return workspace.id;
      }
    }

    return this.parseMetadataUuid(metadata?.workspaceId) ?? null;
  }

  private async getPlanDetails(subscription: Stripe.Subscription) {
    const currentPrice = subscription.items.data[0]?.price;

    if (!currentPrice) {
      return {
        planName: null,
        productId: null,
      };
    }

    if (typeof currentPrice.product !== "string") {
      return {
        planName: currentPrice.product.deleted ? null : currentPrice.product.name,
        productId: currentPrice.product.id,
      };
    }

    const stripeProduct = await stripe.products.retrieve(currentPrice.product);

    return {
      planName: stripeProduct.deleted ? null : stripeProduct.name,
      productId: stripeProduct.id,
    };
  }

  private async syncSubscription(
    subscription: Stripe.Subscription,
    eventType: string,
    metadataOverride?: StripeMetadata,
  ) {
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id ?? null;
    const metadata = metadataOverride ?? (subscription.metadata as StripeMetadata);
    const workspaceId = await this.resolveWorkspaceId(customerId, metadata);

    if (!workspaceId) {
      throw new BadRequestException(
        "Stripe webhook did not include a resolvable workspace id",
      );
    }

    const { planName, productId } = await this.getPlanDetails(subscription);
    const shouldClearPlan =
      subscription.status === "canceled" || subscription.status === "unpaid";

    await db
      .update(teams)
      .set({
        planName: shouldClearPlan ? null : planName,
        stripeCustomerId: customerId,
        stripeProductId: shouldClearPlan ? null : productId,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, workspaceId));

    await writeAuditLog({
      workspaceId,
      actorUserId: this.parseMetadataUuid(metadata?.actorUserId),
      action: AuditAction.BILLING_SUBSCRIPTION_SYNCED,
      entityType: "workspace",
      entityId: workspaceId,
      source: "worker",
      metadata: {
        eventType,
        planName,
        productId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
      },
    });
  }

  async createCheckoutSession(
    context: ApiWorkspaceContext,
    input: BillingCheckoutRequest,
  ): Promise<BillingCheckoutResponse> {
    loadRootEnv();

    const stripeConfig = getStripeConfig();
    const session = await stripe.checkout.sessions.create({
      allow_promotion_codes: true,
      cancel_url: `${stripeConfig.baseUrl}/pricing`,
      client_reference_id: String(context.membership.userId),
      customer: context.workspace.stripeCustomerId || undefined,
      line_items: [
        {
          price: input.priceId,
          quantity: 1,
        },
      ],
      metadata: {
        actorUserId: String(context.membership.userId),
        workspaceId: String(context.workspace.id),
      },
      mode: "subscription",
      payment_method_types: ["card"],
      subscription_data: {
        metadata: {
          actorUserId: String(context.membership.userId),
          workspaceId: String(context.workspace.id),
        },
        trial_period_days: 14,
      },
      success_url: `${stripeConfig.baseUrl}/api/stripe/checkout?session_id={CHECKOUT_SESSION_ID}`,
    });

    if (!session.url) {
      throw new InternalServerErrorException("Stripe checkout did not return a URL");
    }

    await writeAuditLog({
      workspaceId: context.workspace.id,
      actorUserId: context.membership.userId,
      actorRole: context.membership.role,
      action: AuditAction.BILLING_CHECKOUT_STARTED,
      entityType: "workspace",
      entityId: context.workspace.id,
      source: "api",
      metadata: {
        priceId: input.priceId,
        stripeCustomerId: context.workspace.stripeCustomerId,
      },
    });

    return {
      url: session.url,
    };
  }

  async handleStripeWebhook(
    request: StripeWebhookRequest,
  ): Promise<BillingStripeWebhookResponse> {
    loadRootEnv();

    const signature = Array.isArray(request.headers["stripe-signature"])
      ? request.headers["stripe-signature"][0]
      : request.headers["stripe-signature"];

    if (!signature) {
      throw new BadRequestException("Missing Stripe signature");
    }

    if (!request.rawBody) {
      throw new BadRequestException("Missing Stripe raw body");
    }

    const stripeConfig = getStripeConfig();
    const event = stripe.webhooks.constructEvent(
      request.rawBody,
      signature,
      stripeConfig.webhookSecret,
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        const subscriptionId =
          typeof checkoutSession.subscription === "string"
            ? checkoutSession.subscription
            : checkoutSession.subscription?.id;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ["items.data.price.product"],
          });

          await this.syncSubscription(
            subscription,
            event.type,
            checkoutSession.metadata as StripeMetadata,
          );
        }

        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await this.syncSubscription(subscription, event.type);
        break;
      }
      default:
        break;
    }

    return {
      received: true,
    };
  }
}
