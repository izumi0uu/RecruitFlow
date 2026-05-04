import { Controller, Get } from "@nestjs/common";

import { DEFAULT_WEB_PORT, getApiRuntimeConfig } from "@recruitflow/config";
import type { ApiDocsEndpoint, ApiDocsResponse } from "@recruitflow/contracts";

const API_DOC_ENDPOINTS: ApiDocsEndpoint[] = [
  {
    auth: "public",
    description:
      "API liveness check for local orchestration and deployment probes.",
    method: "GET",
    owner: "api",
    path: "/health",
  },
  {
    auth: "public",
    description:
      "Human-readable JSON contract catalogue for the Phase 1.5 API split.",
    method: "GET",
    owner: "api",
    path: "/docs",
  },
  {
    auth: "session",
    description:
      "Validate the shared session cookie and return the current user id.",
    method: "GET",
    owner: "api",
    path: "/auth/session",
  },
  {
    auth: "public",
    description:
      "Create a user, workspace or invitation-backed membership, and session token.",
    method: "POST",
    owner: "api",
    path: "/auth/sign-up",
  },
  {
    auth: "public",
    description:
      "Validate credentials and return a session token using the shared cookie contract.",
    method: "POST",
    owner: "api",
    path: "/auth/sign-in",
  },
  {
    auth: "session",
    description:
      "Record sign-out activity for the current authenticated session.",
    method: "POST",
    owner: "api",
    path: "/auth/sign-out",
  },
  {
    auth: "session",
    description:
      "Update the current user's password through the API-owned auth service.",
    method: "PATCH",
    owner: "api",
    path: "/auth/password",
  },
  {
    auth: "session",
    description:
      "Update the current user's account identity through the API-owned auth service.",
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
    description:
      "Create a pending workspace invitation and audit the member invite.",
    method: "POST",
    owner: "api",
    path: "/members/invitations",
  },
  {
    auth: "owner",
    description:
      "Remove a workspace member while preserving owner safety checks.",
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
    description:
      "Create a Stripe billing portal session and audit the portal handoff.",
    method: "POST",
    owner: "api",
    path: "/billing/portal",
  },
  {
    auth: "public",
    description:
      "Verify Stripe webhook signatures and sync subscription state.",
    method: "POST",
    owner: "api",
    path: "/billing/webhooks/stripe",
  },
  {
    auth: "session",
    description:
      "Workspace-scoped clients list with filters, sorting, owners, and active job counts.",
    method: "GET",
    owner: "api",
    path: "/clients",
  },
  {
    auth: "session",
    description: "Create a workspace-scoped client and audit the CRM mutation.",
    method: "POST",
    owner: "api",
    path: "/clients",
  },
  {
    auth: "session",
    description:
      "Load one workspace-scoped client baseline record for detail and edit flows.",
    method: "GET",
    owner: "api",
    path: "/clients/:clientId",
  },
  {
    auth: "session",
    description:
      "Update one workspace-scoped client baseline record and audit the CRM mutation.",
    method: "PATCH",
    owner: "api",
    path: "/clients/:clientId",
  },
  {
    auth: "session",
    description:
      "Archive a workspace-scoped client and audit the destructive CRM mutation.",
    method: "PATCH",
    owner: "api",
    path: "/clients/:clientId/archive",
  },
  {
    auth: "session",
    description:
      "Restore an archived workspace-scoped client to active status and audit the CRM mutation.",
    method: "PATCH",
    owner: "api",
    path: "/clients/:clientId/restore",
  },
  {
    auth: "session",
    description:
      "Create a workspace-scoped contact under a client and audit the CRM mutation.",
    method: "POST",
    owner: "api",
    path: "/clients/:clientId/contacts",
  },
  {
    auth: "session",
    description:
      "Update a workspace-scoped client contact and audit the CRM mutation.",
    method: "PATCH",
    owner: "api",
    path: "/clients/:clientId/contacts/:contactId",
  },
  {
    auth: "session",
    description:
      "Workspace-scoped jobs list with client, owner, status, and priority filters.",
    method: "GET",
    owner: "api",
    path: "/jobs",
  },
  {
    auth: "session",
    description:
      "Create a workspace-scoped job intake record and audit the mutation.",
    method: "POST",
    owner: "api",
    path: "/jobs",
  },
  {
    auth: "session",
    description: "Load one workspace-scoped job intake record for edit flows.",
    method: "GET",
    owner: "api",
    path: "/jobs/:jobId",
  },
  {
    auth: "session",
    description:
      "Update one workspace-scoped job intake record and audit the mutation.",
    method: "PATCH",
    owner: "api",
    path: "/jobs/:jobId",
  },
  {
    auth: "session",
    description:
      "Repair missing default stage rows for one workspace-scoped job.",
    method: "POST",
    owner: "api",
    path: "/jobs/:jobId/stages/repair",
  },
  {
    auth: "session",
    description:
      "Return a workspace-scoped candidate list for the Candidate CRM.",
    method: "GET",
    owner: "api",
    path: "/candidates",
  },
  {
    auth: "session",
    description:
      "Create a workspace-scoped candidate profile and audit the mutation.",
    method: "POST",
    owner: "api",
    path: "/candidates",
  },
  {
    auth: "session",
    description:
      "Load one workspace-scoped candidate profile for detail and edit flows.",
    method: "GET",
    owner: "api",
    path: "/candidates/:candidateId",
  },
  {
    auth: "session",
    description:
      "Update one workspace-scoped candidate profile and audit the mutation.",
    method: "PATCH",
    owner: "api",
    path: "/candidates/:candidateId",
  },
  {
    auth: "session",
    description:
      "Return workspace-scoped document metadata with type and linked entity filters.",
    method: "GET",
    owner: "api",
    path: "/documents",
  },
  {
    auth: "session",
    description:
      "Create workspace-scoped document metadata linked to a candidate, job, or submission.",
    method: "POST",
    owner: "api",
    path: "/documents",
  },
  {
    auth: "session",
    description:
      "Return workspace-scoped submissions with job, candidate, owner, stage, risk, and next-step filters.",
    method: "GET",
    owner: "api",
    path: "/submissions",
  },
  {
    auth: "session",
    description:
      "Create a workspace-scoped candidate-to-job submission and audit the mutation.",
    method: "POST",
    owner: "api",
    path: "/submissions",
  },
  {
    auth: "session",
    description:
      "Move a workspace-scoped submission to another stage and audit the transition.",
    method: "PATCH",
    owner: "api",
    path: "/submissions/:submissionId/stage",
  },
  {
    auth: "session",
    description:
      "Update a submission risk flag or next step and audit changed fields.",
    method: "PATCH",
    owner: "api",
    path: "/submissions/:submissionId/follow-up",
  },
  {
    auth: "session",
    description:
      "Return workspace-scoped tasks with owner, entity, status, overdue, snoozed, and done views.",
    method: "GET",
    owner: "api",
    path: "/tasks",
  },
  {
    auth: "session",
    description:
      "Create a workspace-scoped follow-up task linked to a client, job, candidate, or submission.",
    method: "POST",
    owner: "api",
    path: "/tasks",
  },
  {
    auth: "session",
    description:
      "Update title, note, owner, due date, or linked entity for one workspace-scoped task.",
    method: "PATCH",
    owner: "api",
    path: "/tasks/:taskId",
  },
  {
    auth: "session",
    description:
      "Complete, snooze, or reopen one workspace-scoped task and audit the status change.",
    method: "PATCH",
    owner: "api",
    path: "/tasks/:taskId/status",
  },
  {
    auth: "session",
    description:
      "Return a normalized activity timeline for one workspace-scoped client, job, candidate, or submission.",
    method: "GET",
    owner: "api",
    path: "/activity/timeline",
  },
  {
    auth: "session",
    description:
      "Return workspace-visible notes for one client, job, candidate, or submission.",
    method: "GET",
    owner: "api",
    path: "/notes",
  },
  {
    auth: "session",
    description:
      "Create a workspace-visible note linked to a client, job, candidate, or submission and audit the action.",
    method: "POST",
    owner: "api",
    path: "/notes",
  },
  {
    auth: "session",
    description:
      "Archive an active note or final-delete an already archived note with API-enforced permissions.",
    method: "DELETE",
    owner: "api",
    path: "/notes/:noteId",
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
