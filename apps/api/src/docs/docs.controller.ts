import { Controller, Get } from "@nestjs/common";

import {
  DEFAULT_WEB_PORT,
  getApiRuntimeConfig,
} from "@recruitflow/config";
import type { ApiDocsEndpoint, ApiDocsResponse } from "@recruitflow/contracts";

const API_DOC_ENDPOINTS: ApiDocsEndpoint[] = [
  {
    auth: "public",
    description: "API liveness check for local orchestration and deployment probes.",
    method: "GET",
    owner: "api",
    path: "/health",
  },
  {
    auth: "public",
    description: "Human-readable JSON contract catalogue for the Phase 1.5 API split.",
    method: "GET",
    owner: "api",
    path: "/docs",
  },
  {
    auth: "session",
    description: "Validate the shared session cookie and return the current user id.",
    method: "GET",
    owner: "api",
    path: "/auth/session",
  },
  {
    auth: "public",
    description: "Create a user, workspace or invitation-backed membership, and session token.",
    method: "POST",
    owner: "api",
    path: "/auth/sign-up",
  },
  {
    auth: "public",
    description: "Validate credentials and return a session token using the shared cookie contract.",
    method: "POST",
    owner: "api",
    path: "/auth/sign-in",
  },
  {
    auth: "session",
    description: "Record sign-out activity for the current authenticated session.",
    method: "POST",
    owner: "api",
    path: "/auth/sign-out",
  },
  {
    auth: "session",
    description: "Update the current user's password through the API-owned auth service.",
    method: "PATCH",
    owner: "api",
    path: "/auth/password",
  },
  {
    auth: "session",
    description: "Update the current user's account identity through the API-owned auth service.",
    method: "PATCH",
    owner: "api",
    path: "/auth/account",
  },
  {
    auth: "session",
    description: "Soft-delete the current user account and remove memberships.",
    method: "DELETE",
    owner: "api",
    path: "/auth/account",
  },
  {
    auth: "session",
    description: "Return the current workspace bundle and member roster.",
    method: "GET",
    owner: "api",
    path: "/workspaces/current",
  },
  {
    auth: "session",
    description: "Return the current user's workspace membership and role.",
    method: "GET",
    owner: "api",
    path: "/memberships/current",
  },
  {
    auth: "owner",
    description: "Create a pending workspace invitation and audit the member invite.",
    method: "POST",
    owner: "api",
    path: "/members/invitations",
  },
  {
    auth: "owner",
    description: "Remove a workspace member while preserving owner safety checks.",
    method: "DELETE",
    owner: "api",
    path: "/members/:memberId",
  },
  {
    auth: "owner",
    description: "Create a Stripe checkout session with workspace metadata.",
    method: "POST",
    owner: "api",
    path: "/billing/checkout",
  },
  {
    auth: "owner",
    description: "Create a Stripe billing portal session and audit the portal handoff.",
    method: "POST",
    owner: "api",
    path: "/billing/portal",
  },
  {
    auth: "public",
    description: "Verify Stripe webhook signatures and sync subscription state.",
    method: "POST",
    owner: "api",
    path: "/billing/webhooks/stripe",
  },
  {
    auth: "session",
    description: "Workspace-scoped placeholder for Wave 2 clients implementation.",
    method: "GET",
    owner: "api",
    path: "/clients",
  },
  {
    auth: "session",
    description: "Workspace-scoped placeholder for Wave 2 jobs implementation.",
    method: "GET",
    owner: "api",
    path: "/jobs",
  },
  {
    auth: "session",
    description: "Workspace-scoped placeholder for Wave 2 candidates implementation.",
    method: "GET",
    owner: "api",
    path: "/candidates",
  },
  {
    auth: "session",
    description: "Workspace-scoped placeholder for Wave 3 submissions implementation.",
    method: "GET",
    owner: "api",
    path: "/submissions",
  },
];

const localApiUrl = (path: string) => {
  const apiRuntimeConfig = getApiRuntimeConfig();

  return `http://127.0.0.1:${apiRuntimeConfig.port}${path}`;
};

@Controller("docs")
export class DocsController {
  @Get()
  getDocs(): ApiDocsResponse {
    const apiRuntimeConfig = getApiRuntimeConfig();

    return {
      contractVersion: "phase-1.5",
      endpoints: API_DOC_ENDPOINTS,
      generatedAt: new Date().toISOString(),
      localDev: {
        api: "pnpm dev:api",
        docsUrl: localApiUrl("/docs"),
        healthUrl: localApiUrl("/health"),
        stack: "pnpm dev:stack",
        stripeWebhookForward: `stripe listen --forward-to localhost:${DEFAULT_WEB_PORT}/api/stripe/webhook`,
        web: "pnpm dev:web",
      },
      observability: {
        logging:
          "Every API request emits method, path, status, duration, and request_id.",
        requestIdHeader: "x-request-id",
        responseHeader: "x-request-id",
      },
      runtime: "nest",
      service: apiRuntimeConfig.serviceName,
    };
  }
}
