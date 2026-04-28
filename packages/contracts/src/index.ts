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

export const apiClientStatusValues = [
  "active",
  "prospect",
  "paused",
  "archived",
] as const;

export type ApiClientStatus = (typeof apiClientStatusValues)[number];

export const apiClientPriorityValues = ["low", "medium", "high"] as const;

export type ApiClientPriority = (typeof apiClientPriorityValues)[number];

export const apiJobStatusValues = [
  "intake",
  "open",
  "on_hold",
  "closed",
  "filled",
] as const;

export type ApiJobStatus = (typeof apiJobStatusValues)[number];

export const apiJobPriorityValues = [
  "low",
  "medium",
  "high",
  "urgent",
] as const;

export type ApiJobPriority = (typeof apiJobPriorityValues)[number];

export const apiSubmissionStageValues = [
  "sourced",
  "screening",
  "submitted",
  "client_interview",
  "offer",
  "placed",
  "lost",
] as const;

export type ApiSubmissionStage = (typeof apiSubmissionStageValues)[number];

export const apiRiskFlagValues = [
  "none",
  "timing_risk",
  "feedback_risk",
  "compensation_risk",
  "fit_risk",
] as const;

export type ApiRiskFlag = (typeof apiRiskFlagValues)[number];

export const apiCrmDomainValues = [
  "clients",
  "jobs",
  "candidates",
  "submissions",
] as const;

export type ApiCrmDomain = (typeof apiCrmDomainValues)[number];

const listPageSchema = z.coerce.number().int().min(1);
const listPageSizeSchema = z.coerce.number().int().min(1).max(100);
const optionalUuidSchema = z.string().uuid().optional();

export const apiCollectionQuerySchema = z.object({
  includeArchived: z.coerce.boolean().default(false),
  page: listPageSchema.default(1),
  pageSize: listPageSizeSchema.default(25),
  search: z.string().trim().max(200).optional(),
});

export type ApiCollectionQuery = z.infer<typeof apiCollectionQuerySchema>;

export const clientsListQuerySchema = apiCollectionQuerySchema.extend({
  ownerUserId: optionalUuidSchema,
  priority: z.enum(apiClientPriorityValues).optional(),
  status: z.enum(apiClientStatusValues).optional(),
});

export type ClientsListQuery = z.infer<typeof clientsListQuerySchema>;

export const jobsListQuerySchema = apiCollectionQuerySchema.extend({
  clientId: optionalUuidSchema,
  ownerUserId: optionalUuidSchema,
  priority: z.enum(apiJobPriorityValues).optional(),
  status: z.enum(apiJobStatusValues).optional(),
});

export type JobsListQuery = z.infer<typeof jobsListQuerySchema>;

export const candidatesListQuerySchema = apiCollectionQuerySchema.extend({
  ownerUserId: optionalUuidSchema,
  source: z.string().trim().max(100).optional(),
});

export type CandidatesListQuery = z.infer<typeof candidatesListQuerySchema>;

export const submissionsListQuerySchema = apiCollectionQuerySchema.extend({
  candidateId: optionalUuidSchema,
  jobId: optionalUuidSchema,
  ownerUserId: optionalUuidSchema,
  riskFlag: z.enum(apiRiskFlagValues).optional(),
  stage: z.enum(apiSubmissionStageValues).optional(),
});

export type SubmissionsListQuery = z.infer<
  typeof submissionsListQuerySchema
>;

export interface ApiCrmReservedRoute {
  method: "DELETE" | "GET" | "PATCH" | "POST";
  path: string;
  purpose: string;
}

export interface ApiCrmPlaceholderContext {
  role: ApiWorkspaceRole;
  workspaceId: string;
}

export interface ApiCrmModulePlaceholderResponse<TQuery> {
  context: ApiCrmPlaceholderContext;
  contractVersion: "phase-1.5";
  domain: ApiCrmDomain;
  implementationStory: string;
  message: string;
  ownerBranch: string;
  query: TQuery;
  reservedRoutes: ApiCrmReservedRoute[];
  status: "placeholder";
  workspaceScoped: true;
}

export function createCrmModulePlaceholderResponse<TQuery>(overrides: {
  context: ApiCrmPlaceholderContext;
  domain: ApiCrmDomain;
  implementationStory: string;
  message: string;
  ownerBranch: string;
  query: TQuery;
  reservedRoutes: ApiCrmReservedRoute[];
}): ApiCrmModulePlaceholderResponse<TQuery> {
  return {
    context: overrides.context,
    contractVersion: "phase-1.5",
    domain: overrides.domain,
    implementationStory: overrides.implementationStory,
    message: overrides.message,
    ownerBranch: overrides.ownerBranch,
    query: overrides.query,
    reservedRoutes: overrides.reservedRoutes,
    status: "placeholder",
    workspaceScoped: true,
  };
}

export type ClientsModulePlaceholderResponse =
  ApiCrmModulePlaceholderResponse<ClientsListQuery>;

export type JobsModulePlaceholderResponse =
  ApiCrmModulePlaceholderResponse<JobsListQuery>;

export type CandidatesModulePlaceholderResponse =
  ApiCrmModulePlaceholderResponse<CandidatesListQuery>;

export type SubmissionsModulePlaceholderResponse =
  ApiCrmModulePlaceholderResponse<SubmissionsListQuery>;

export interface CurrentWorkspaceMemberResponse {
  id: string;
  joinedAt: string | null;
  role: ApiWorkspaceRole;
  user: {
    email: string;
    id: string;
    name: string | null;
  };
  userId: string;
  workspaceId: string;
}

export interface CurrentWorkspaceSummaryResponse {
  createdAt: string;
  id: string;
  name: string;
  planName: string | null;
  stripeCustomerId: string | null;
  stripeProductId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  updatedAt: string;
}

export interface CurrentWorkspaceResponse
  extends CurrentWorkspaceSummaryResponse {
  memberships: CurrentWorkspaceMemberResponse[];
}

export interface CurrentMembershipResponse {
  id: string;
  joinedAt: string | null;
  role: ApiWorkspaceRole;
  userId: string;
  workspace: CurrentWorkspaceSummaryResponse;
  workspaceId: string;
}

export const authSignUpRequestSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100),
  inviteId: z.string().uuid().optional(),
});

export type AuthSignUpRequest = z.infer<typeof authSignUpRequestSchema>;

export interface AuthSessionTokenResponse {
  expires: string;
  role: ApiWorkspaceRole;
  token: string;
  user: {
    id: string;
  };
}

export type AuthSignUpResponse = AuthSessionTokenResponse;

export const authSignInRequestSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100),
});

export type AuthSignInRequest = z.infer<typeof authSignInRequestSchema>;

export type AuthSignInResponse = AuthSessionTokenResponse;

export interface AuthSignOutResponse {
  success: true;
}

export const authPasswordUpdateRequestSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100),
});

export type AuthPasswordUpdateRequest = z.infer<
  typeof authPasswordUpdateRequestSchema
>;

export interface AuthPasswordUpdateResponse {
  success: string;
}

export const authAccountUpdateRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required").max(100),
});

export type AuthAccountUpdateRequest = z.infer<
  typeof authAccountUpdateRequestSchema
>;

export interface AuthAccountUpdateResponse {
  name: string;
  success: string;
}

export const authAccountDeleteRequestSchema = z.object({
  password: z.string().min(8).max(100),
});

export type AuthAccountDeleteRequest = z.infer<
  typeof authAccountDeleteRequestSchema
>;

export interface AuthAccountDeleteResponse {
  success: true;
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
    workspaceId: string;
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
