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
    id: number;
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
  userId: number;
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
  inviteId: z.coerce.number().int().positive().optional(),
});

export type AuthSignUpRequest = z.infer<typeof authSignUpRequestSchema>;

export interface AuthSignUpResponse {
  expires: string;
  role: ApiWorkspaceRole;
  token: string;
  user: {
    id: number;
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
    id: number;
    role: ApiWorkspaceRole;
    status: "pending";
    teamId: number;
  };
  message: string;
}

export const memberRemovalParamsSchema = z.object({
  memberId: z.coerce.number().int().positive(),
});

export type MemberRemovalParams = z.infer<typeof memberRemovalParamsSchema>;

export interface MemberRemovalResponse {
  memberId: number;
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
