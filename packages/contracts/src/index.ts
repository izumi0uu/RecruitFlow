import { z } from "zod";

export type HealthStatus = "ok";

export interface HealthResponse {
  service: string;
  status: HealthStatus;
  runtime: "nest";
  timestamp: string;
}

export interface AuthSessionResponse {
  expires: string;
  user: {
    id: string;
  };
}

export function createHealthResponse(
  overrides: Pick<HealthResponse, "service">,
): HealthResponse {
  return {
    service: overrides.service,
    status: "ok",
    runtime: "nest",
    timestamp: new Date().toISOString(),
  };
}

export function createAuthSessionResponse(overrides: {
  expires: string;
  userId: string;
}): AuthSessionResponse {
  return {
    expires: overrides.expires,
    user: {
      id: overrides.userId,
    },
  };
}

export const apiWorkspaceRoleValues = [
  "owner",
  "recruiter",
  "coordinator",
] as const;

export type ApiWorkspaceRole = (typeof apiWorkspaceRoleValues)[number];

export const authSignUpRequestSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100),
  inviteId: z.string().uuid().optional(),
});

export type AuthSignUpRequest = z.infer<typeof authSignUpRequestSchema>;

export interface AuthSignUpResponse {
  expires: string;
  role: ApiWorkspaceRole;
  token: string;
  user: {
    id: string;
  };
}

export const memberInvitationRequestSchema = z.object({
  email: z.string().email().min(3).max(255),
  role: z.enum(apiWorkspaceRoleValues),
});

export type MemberInvitationRequest = z.infer<
  typeof memberInvitationRequestSchema
>;

export interface MemberInvitationResponse {
  invitation: {
    email: string;
    id: string;
    role: ApiWorkspaceRole;
    status: "pending";
    teamId: string;
  };
  message: string;
}

export const memberRemovalParamsSchema = z.object({
  memberId: z.string().uuid(),
});

export type MemberRemovalParams = z.infer<typeof memberRemovalParamsSchema>;

export interface MemberRemovalResponse {
  memberId: string;
  message: string;
  removed: true;
}

export const billingCheckoutRequestSchema = z.object({
  priceId: z.string().min(1),
});

export type BillingCheckoutRequest = z.infer<
  typeof billingCheckoutRequestSchema
>;

export interface BillingCheckoutResponse {
  url: string;
}

export interface BillingStripeWebhookResponse {
  received: true;
}
