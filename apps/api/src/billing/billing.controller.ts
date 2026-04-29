import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import {
  billingCheckoutRequestSchema,
  type BillingCheckoutResponse,
  type BillingPortalResponse,
  type BillingStripeWebhookResponse,
} from "@recruitflow/contracts";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentWorkspaceContext } from "../workspace/current-workspace-context.decorator";
import { RequireWorkspaceRole } from "../workspace/require-workspace-role.decorator";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";
import { WorkspaceContextGuard } from "../workspace/workspace.guard";
import { WorkspaceRoleGuard } from "../workspace/workspace-role.guard";

import { BillingService } from "./billing.service";

type StripeWebhookRequest = {
  headers: {
    "stripe-signature"?: string | string[];
  };
  rawBody?: Buffer;
};

@Controller("billing")
export class BillingController {
  private readonly billingService = new BillingService();

  @Post("checkout")
  @UseGuards(AuthGuard, WorkspaceContextGuard, WorkspaceRoleGuard)
  @RequireWorkspaceRole({ allowedRoles: ["owner"] })
  async createCheckoutSession(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Body() body: unknown,
  ): Promise<BillingCheckoutResponse> {
    const parsedBody = billingCheckoutRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid checkout payload",
      );
    }

    return this.billingService.createCheckoutSession(context, parsedBody.data);
  }

  @Post("portal")
  @UseGuards(AuthGuard, WorkspaceContextGuard, WorkspaceRoleGuard)
  @RequireWorkspaceRole({ allowedRoles: ["owner"] })
  async createPortalSession(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
  ): Promise<BillingPortalResponse> {
    return this.billingService.createPortalSession(context);
  }

  @Post("webhooks/stripe")
  async handleStripeWebhook(
    @Req() request: StripeWebhookRequest,
  ): Promise<BillingStripeWebhookResponse> {
    return this.billingService.handleStripeWebhook(request);
  }
}
