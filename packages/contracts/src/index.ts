import { z } from "zod";

export type HealthStatus = "ok";

export interface HealthResponse {
  service: string;
  status: HealthStatus;
  runtime: "nest";
  timestamp: string;
}

export interface ApiDocsEndpoint {
  auth: "owner" | "public" | "session";
  description: string;
  method: "DELETE" | "GET" | "PATCH" | "POST";
  owner: "api";
  path: string;
}

export interface ApiDocsResponse {
  contractVersion: "phase-1.5";
  endpoints: ApiDocsEndpoint[];
  generatedAt: string;
  localDev: {
    api: string;
    docsUrl: string;
    healthUrl: string;
    stack: string;
    stripeWebhookForward: string;
    web: string;
  };
  observability: {
    logging: string;
    requestIdHeader: "x-request-id";
    responseHeader: "x-request-id";
  };
  runtime: "nest";
  service: string;
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

export const apiClientEditableStatusValues = [
  "active",
  "prospect",
  "paused",
] as const;

export type ApiClientEditableStatus =
  (typeof apiClientEditableStatusValues)[number];

export const apiClientPriorityValues = ["low", "medium", "high"] as const;

export type ApiClientPriority = (typeof apiClientPriorityValues)[number];

export const apiClientSortValues = [
  "name_asc",
  "name_desc",
  "updated_desc",
  "priority_desc",
  "last_contacted_desc",
] as const;

export type ApiClientSort = (typeof apiClientSortValues)[number];

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

export const apiJobSortValues = [
  "opened_desc",
  "updated_desc",
  "title_asc",
  "priority_desc",
  "target_fill_asc",
] as const;

export type ApiJobSort = (typeof apiJobSortValues)[number];

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

export interface ApiJobStageTemplateItem {
  isClosedStage: boolean;
  key: ApiSubmissionStage;
  label: string;
  sortOrder: number;
}

export const apiDefaultJobStageTemplate = [
  {
    isClosedStage: false,
    key: "sourced",
    label: "Sourced",
    sortOrder: 1,
  },
  {
    isClosedStage: false,
    key: "screening",
    label: "Screening",
    sortOrder: 2,
  },
  {
    isClosedStage: false,
    key: "submitted",
    label: "Submitted",
    sortOrder: 3,
  },
  {
    isClosedStage: false,
    key: "client_interview",
    label: "Client Interview",
    sortOrder: 4,
  },
  {
    isClosedStage: false,
    key: "offer",
    label: "Offer",
    sortOrder: 5,
  },
  {
    isClosedStage: true,
    key: "placed",
    label: "Placed",
    sortOrder: 6,
  },
  {
    isClosedStage: true,
    key: "lost",
    label: "Lost",
    sortOrder: 7,
  },
] as const satisfies readonly ApiJobStageTemplateItem[];

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

const optionalTrimmedTextSchema = (maxLength: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmedValue = value.trim();

      return trimmedValue.length > 0 ? trimmedValue : null;
    },
    z.string().max(maxLength).nullable().optional(),
  );

const optionalIntegerSchema = (message: string) =>
  z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmedValue = value.trim();

        if (!trimmedValue) {
          return null;
        }

        return Number(trimmedValue);
      }

      return value ?? null;
    },
    z.number().int(message).min(0, message).nullable().optional(),
  );

const optionalCurrencyCodeSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value ?? null;
    }

    const trimmedValue = value.trim();

    return trimmedValue.length > 0 ? trimmedValue.toUpperCase() : null;
  },
  z
    .string()
    .regex(/^[A-Z]{3}$/, "Currency must use a 3-letter code")
    .nullable()
    .optional(),
);

const optionalDateInputSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value ?? null;
    }

    const trimmedValue = value.trim();

    return trimmedValue.length > 0 ? trimmedValue : null;
  },
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format")
    .nullable()
    .optional(),
);

const optionalWebsiteSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return null;
    }

    if (/^https?:\/\//i.test(trimmedValue)) {
      return trimmedValue;
    }

    return `https://${trimmedValue}`;
  },
  z.string().url("Website must be a valid URL").max(2048).nullable().optional(),
);

const optionalUrlSchema = (message: string) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") {
        return value;
      }

      const trimmedValue = value.trim();

      if (!trimmedValue) {
        return null;
      }

      if (/^https?:\/\//i.test(trimmedValue)) {
        return trimmedValue;
      }

      return `https://${trimmedValue}`;
    },
    z.string().url(message).max(2048).nullable().optional(),
  );

export const apiCollectionQuerySchema = z.object({
  includeArchived: z.coerce.boolean().default(false),
  page: listPageSchema.default(1),
  pageSize: listPageSizeSchema.default(25),
  search: z.string().trim().max(200).optional(),
});

export type ApiCollectionQuery = z.infer<typeof apiCollectionQuerySchema>;

export const clientsListQuerySchema = apiCollectionQuerySchema.extend({
  owner: optionalUuidSchema,
  ownerUserId: optionalUuidSchema,
  priority: z.enum(apiClientPriorityValues).optional(),
  q: z.string().trim().max(200).optional(),
  sort: z.enum(apiClientSortValues).default("name_asc"),
  status: z.enum(apiClientStatusValues).optional(),
});

export type ClientsListQuery = z.infer<typeof clientsListQuerySchema>;

export interface ClientsListOwnerOption {
  email: string;
  id: string;
  name: string | null;
}

export interface ClientRecord {
  archivedAt: string | null;
  createdAt: string;
  hqLocation: string | null;
  id: string;
  industry: string | null;
  lastContactedAt: string | null;
  name: string;
  notesPreview: string | null;
  openJobsCount: number;
  owner: ClientsListOwnerOption | null;
  ownerUserId: string | null;
  priority: ApiClientPriority;
  status: ApiClientStatus;
  updatedAt: string;
  website: string | null;
}

export type ClientsListItem = ClientRecord;

export interface ClientsListResponse {
  context: ApiCrmPlaceholderContext;
  contractVersion: "phase-1";
  filters: {
    includeArchived: boolean;
    owner: string | null;
    priority: ApiClientPriority | null;
    q: string | null;
    sort: ApiClientSort;
    status: ApiClientStatus | null;
  };
  items: ClientsListItem[];
  ownerOptions: ClientsListOwnerOption[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  workspaceScoped: true;
}

export interface ClientContactRecord {
  clientId: string;
  createdAt: string;
  email: string | null;
  fullName: string;
  id: string;
  isPrimary: boolean;
  lastContactedAt: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  relationshipType: string | null;
  title: string | null;
  updatedAt: string;
}

export const clientParamsSchema = z.object({
  clientId: z.string().uuid(),
});

export type ClientParams = z.infer<typeof clientParamsSchema>;

export const clientContactParamsSchema = clientParamsSchema.extend({
  contactId: z.string().uuid(),
});

export type ClientContactParams = z.infer<
  typeof clientContactParamsSchema
>;

export const clientMutationRequestSchema = z.object({
  hqLocation: optionalTrimmedTextSchema(160),
  industry: optionalTrimmedTextSchema(120),
  name: z.string().trim().min(1, "Client name is required").max(160),
  notesPreview: optionalTrimmedTextSchema(2000),
  ownerUserId: optionalUuidSchema,
  priority: z.enum(apiClientPriorityValues).default("medium"),
  status: z.enum(apiClientEditableStatusValues).default("active"),
  website: optionalWebsiteSchema,
});

export type ClientMutationRequest = z.infer<
  typeof clientMutationRequestSchema
>;

export interface ClientDetailResponse {
  client: ClientRecord;
  contacts: ClientContactRecord[];
  context: ApiCrmPlaceholderContext;
  contractVersion: "phase-1";
  ownerOptions: ClientsListOwnerOption[];
  workspaceScoped: true;
}

export interface ClientMutationResponse extends ClientDetailResponse {
  message: string;
}

export interface ClientArchiveResponse extends ClientDetailResponse {
  archived: true;
  message: string;
}

export const clientContactMutationRequestSchema = z.object({
  email: optionalTrimmedTextSchema(255).pipe(
    z.string().email("Contact email must be valid").nullable().optional(),
  ),
  fullName: z.string().trim().min(1, "Contact name is required").max(160),
  isPrimary: z.boolean().default(false),
  linkedinUrl: optionalUrlSchema("LinkedIn URL must be valid"),
  phone: optionalTrimmedTextSchema(50),
  relationshipType: optionalTrimmedTextSchema(80),
  title: optionalTrimmedTextSchema(160),
});

export type ClientContactMutationRequest = z.infer<
  typeof clientContactMutationRequestSchema
>;

export interface ClientContactMutationResponse {
  contact: ClientContactRecord;
  contacts: ClientContactRecord[];
  context: ApiCrmPlaceholderContext;
  contractVersion: "phase-1";
  message: string;
  workspaceScoped: true;
}

export const jobsListQuerySchema = apiCollectionQuerySchema.extend({
  clientId: optionalUuidSchema,
  owner: optionalUuidSchema,
  ownerUserId: optionalUuidSchema,
  priority: z.enum(apiJobPriorityValues).optional(),
  q: z.string().trim().max(200).optional(),
  sort: z.enum(apiJobSortValues).default("opened_desc"),
  status: z.enum(apiJobStatusValues).optional(),
});

export type JobsListQuery = z.infer<typeof jobsListQuerySchema>;

export const jobParamsSchema = z.object({
  jobId: z.string().uuid(),
});

export type JobParams = z.infer<typeof jobParamsSchema>;

export const jobMutationRequestSchema = z
  .object({
    clientId: z.string().uuid("Client is required"),
    currency: optionalCurrencyCodeSchema,
    department: optionalTrimmedTextSchema(120),
    description: optionalTrimmedTextSchema(8000),
    employmentType: optionalTrimmedTextSchema(80),
    headcount: optionalIntegerSchema("Headcount must be a whole number"),
    intakeSummary: optionalTrimmedTextSchema(4000),
    location: optionalTrimmedTextSchema(160),
    ownerUserId: z.string().uuid("Job owner is required"),
    placementFeePercent: optionalIntegerSchema(
      "Placement fee must be a whole number",
    ),
    priority: z.enum(apiJobPriorityValues).default("medium"),
    salaryMax: optionalIntegerSchema("Maximum salary must be a whole number"),
    salaryMin: optionalIntegerSchema("Minimum salary must be a whole number"),
    status: z.enum(apiJobStatusValues).default("intake"),
    targetFillDate: optionalDateInputSchema,
    title: z.string().trim().min(1, "Job title is required").max(180),
  })
  .superRefine((input, context) => {
    if (
      input.salaryMin != null &&
      input.salaryMax != null &&
      input.salaryMax < input.salaryMin
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Maximum salary must be greater than minimum salary",
        path: ["salaryMax"],
      });
    }
  });

export type JobMutationRequest = z.infer<typeof jobMutationRequestSchema>;

export interface JobsListClientOption {
  id: string;
  name: string;
}

export interface JobsListOwnerOption {
  email: string;
  id: string;
  name: string | null;
}

export interface JobRecord {
  archivedAt: string | null;
  client: JobsListClientOption | null;
  clientId: string;
  createdAt: string;
  currency: string | null;
  department: string | null;
  description: string | null;
  employmentType: string | null;
  headcount: number | null;
  id: string;
  intakeSummary: string | null;
  location: string | null;
  openedAt: string | null;
  owner: JobsListOwnerOption | null;
  ownerUserId: string | null;
  placementFeePercent: number | null;
  priority: ApiJobPriority;
  salaryMax: number | null;
  salaryMin: number | null;
  status: ApiJobStatus;
  targetFillDate: string | null;
  title: string;
  updatedAt: string;
}

export type JobsListItem = JobRecord;

export interface JobStageRecord {
  createdAt: string;
  id: string;
  isClosedStage: boolean;
  key: string;
  label: string;
  sortOrder: number;
  updatedAt: string;
}

export type JobStageTemplateStatus = "complete" | "missing";

export interface JobStageTemplateSummary {
  expectedStages: ApiJobStageTemplateItem[];
  missingStageKeys: ApiSubmissionStage[];
  repairable: boolean;
  stages: JobStageRecord[];
  status: JobStageTemplateStatus;
}

export interface JobsListResponse {
  clientOptions: JobsListClientOption[];
  context: ApiCrmPlaceholderContext;
  contractVersion: "phase-1";
  filters: {
    clientId: string | null;
    includeArchived: boolean;
    owner: string | null;
    priority: ApiJobPriority | null;
    q: string | null;
    sort: ApiJobSort;
    status: ApiJobStatus | null;
  };
  items: JobsListItem[];
  ownerOptions: JobsListOwnerOption[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  workspaceScoped: true;
}

export interface JobDetailResponse {
  clientOptions: JobsListClientOption[];
  context: ApiCrmPlaceholderContext;
  contractVersion: "phase-1";
  job: JobRecord;
  ownerOptions: JobsListOwnerOption[];
  stageTemplate: JobStageTemplateSummary;
  workspaceScoped: true;
}

export interface JobMutationResponse extends JobDetailResponse {
  message: string;
}

export interface JobStageRepairResponse extends JobDetailResponse {
  message: string;
  repairedStageKeys: ApiSubmissionStage[];
}

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

export interface BillingPortalResponse {
  url: string;
}

export interface BillingStripeWebhookResponse {
  received: true;
}
