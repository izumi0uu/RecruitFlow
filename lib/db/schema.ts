import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const workspaceRoleValues = [
  "owner",
  "recruiter",
  "coordinator",
] as const;
export const clientStatusValues = [
  "active",
  "prospect",
  "paused",
  "archived",
] as const;
export const clientPriorityValues = ["low", "medium", "high"] as const;
export const jobStatusValues = [
  "intake",
  "open",
  "on_hold",
  "closed",
  "filled",
] as const;
export const jobPriorityValues = ["low", "medium", "high", "urgent"] as const;
export const submissionStageValues = [
  "sourced",
  "screening",
  "submitted",
  "client_interview",
  "offer",
  "placed",
  "lost",
] as const;
export const riskFlagValues = [
  "none",
  "timing_risk",
  "feedback_risk",
  "compensation_risk",
  "fit_risk",
] as const;
export const taskStatusValues = ["open", "snoozed", "done"] as const;
export const documentTypeValues = [
  "jd",
  "resume",
  "call_note",
  "interview_note",
] as const;
export const automationTypeValues = [
  "jd_summary",
  "candidate_summary",
  "document_indexing",
  "reminder_generation",
] as const;
export const automationStatusValues = [
  "queued",
  "running",
  "succeeded",
  "failed",
] as const;

export type WorkspaceRole = (typeof workspaceRoleValues)[number];
export type ClientStatus = (typeof clientStatusValues)[number];
export type ClientPriority = (typeof clientPriorityValues)[number];
export type JobStatus = (typeof jobStatusValues)[number];
export type JobPriority = (typeof jobPriorityValues)[number];
export type SubmissionStage = (typeof submissionStageValues)[number];
export type RiskFlag = (typeof riskFlagValues)[number];
export type TaskStatus = (typeof taskStatusValues)[number];
export type DocumentType = (typeof documentTypeValues)[number];
export type AutomationType = (typeof automationTypeValues)[number];
export type AutomationStatus = (typeof automationStatusValues)[number];

export const workspaceRoleEnum = pgEnum("workspace_role", workspaceRoleValues);
export const clientStatusEnum = pgEnum("client_status", clientStatusValues);
export const clientPriorityEnum = pgEnum(
  "client_priority",
  clientPriorityValues,
);
export const jobStatusEnum = pgEnum("job_status", jobStatusValues);
export const jobPriorityEnum = pgEnum("job_priority", jobPriorityValues);
export const submissionStageEnum = pgEnum(
  "submission_stage",
  submissionStageValues,
);
export const riskFlagEnum = pgEnum("risk_flag", riskFlagValues);
export const taskStatusEnum = pgEnum("task_status", taskStatusValues);
export const documentTypeEnum = pgEnum("document_type", documentTypeValues);
export const automationTypeEnum = pgEnum(
  "automation_type",
  automationTypeValues,
);
export const automationStatusEnum = pgEnum(
  "automation_status",
  automationStatusValues,
);

const timestamps = () => ({
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

const idColumn = () => uuid("id").defaultRandom().primaryKey();
const userIdColumn = (name: string) => uuid(name).references(() => users.id);
const workspaceIdColumn = () =>
  uuid("workspace_id")
    .notNull()
    .references(() => teams.id);

export const users = pgTable("users", {
  id: idColumn(),
  name: varchar("name", { length: 100 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: workspaceRoleEnum("role").notNull().default("coordinator"),
  ...timestamps(),
  deletedAt: timestamp("deleted_at"),
});

export const teams = pgTable("teams", {
  id: idColumn(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 120 }).unique(),
  ...timestamps(),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeProductId: text("stripe_product_id"),
  planName: varchar("plan_name", { length: 50 }),
  subscriptionStatus: varchar("subscription_status", { length: 20 }),
});

export const teamMembers = pgTable("team_members", {
  id: idColumn(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id),
  invitedByUserId: userIdColumn("invited_by_user_id"),
  role: workspaceRoleEnum("role").notNull().default("coordinator"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  ...timestamps(),
});

// Legacy audit storage kept live for the current starter flows.
// RF-007 will decide the real cutover into the shared `audit_logs` table.
export const activityLogs = pgTable("activity_logs", {
  id: idColumn(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id),
  userId: userIdColumn("user_id"),
  action: text("action").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  ipAddress: varchar("ip_address", { length: 45 }),
});

export const invitations = pgTable("invitations", {
  id: idColumn(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id),
  email: varchar("email", { length: 255 }).notNull(),
  role: workspaceRoleEnum("role").notNull().default("coordinator"),
  invitedBy: uuid("invited_by")
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp("invited_at").notNull().defaultNow(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
});

// Phase 1 shared-schema placeholders owned by foundation.
export const clients = pgTable("clients", {
  id: idColumn(),
  workspaceId: workspaceIdColumn(),
  name: varchar("name", { length: 160 }).notNull(),
  industry: varchar("industry", { length: 120 }),
  website: text("website"),
  hqLocation: varchar("hq_location", { length: 160 }),
  status: clientStatusEnum("status").notNull().default("active"),
  priority: clientPriorityEnum("priority").notNull().default("medium"),
  ownerUserId: userIdColumn("owner_user_id"),
  lastContactedAt: timestamp("last_contacted_at"),
  notesPreview: text("notes_preview"),
  createdByUserId: userIdColumn("created_by_user_id"),
  ...timestamps(),
  archivedAt: timestamp("archived_at"),
});

export const clientContacts = pgTable("client_contacts", {
  id: idColumn(),
  workspaceId: workspaceIdColumn(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  fullName: varchar("full_name", { length: 160 }).notNull(),
  title: varchar("title", { length: 160 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  linkedinUrl: text("linkedin_url"),
  relationshipType: varchar("relationship_type", { length: 80 }),
  isPrimary: boolean("is_primary").notNull().default(false),
  lastContactedAt: timestamp("last_contacted_at"),
  ...timestamps(),
});

export const jobs = pgTable("jobs", {
  id: idColumn(),
  workspaceId: workspaceIdColumn(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  title: varchar("title", { length: 180 }).notNull(),
  department: varchar("department", { length: 120 }),
  location: varchar("location", { length: 160 }),
  employmentType: varchar("employment_type", { length: 80 }),
  salaryMin: integer("salary_min"),
  salaryMax: integer("salary_max"),
  currency: varchar("currency", { length: 8 }),
  ownerUserId: userIdColumn("owner_user_id"),
  status: jobStatusEnum("status").notNull().default("intake"),
  priority: jobPriorityEnum("priority").notNull().default("medium"),
  headcount: integer("headcount"),
  placementFeePercent: integer("placement_fee_percent"),
  openedAt: timestamp("opened_at"),
  targetFillDate: timestamp("target_fill_date"),
  description: text("description"),
  intakeSummary: text("intake_summary"),
  createdByUserId: userIdColumn("created_by_user_id"),
  ...timestamps(),
  archivedAt: timestamp("archived_at"),
});

export const jobStages = pgTable(
  "job_stages",
  {
    id: idColumn(),
    workspaceId: workspaceIdColumn(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    key: varchar("key", { length: 80 }).notNull(),
    label: varchar("label", { length: 120 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isClosedStage: boolean("is_closed_stage").notNull().default(false),
    ...timestamps(),
  },
  (table) => ({
    jobStagesJobKeyUnique: uniqueIndex("job_stages_job_id_key_unique").on(
      table.jobId,
      table.key,
    ),
  }),
);

export const candidates = pgTable("candidates", {
  id: idColumn(),
  workspaceId: workspaceIdColumn(),
  fullName: varchar("full_name", { length: 160 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  headline: varchar("headline", { length: 180 }),
  currentCompany: varchar("current_company", { length: 180 }),
  currentTitle: varchar("current_title", { length: 180 }),
  location: varchar("location", { length: 160 }),
  salaryExpectation: varchar("salary_expectation", { length: 120 }),
  noticePeriod: varchar("notice_period", { length: 120 }),
  source: varchar("source", { length: 120 }),
  linkedinUrl: text("linkedin_url"),
  portfolioUrl: text("portfolio_url"),
  skillsText: text("skills_text"),
  summary: text("summary"),
  ownerUserId: userIdColumn("owner_user_id"),
  createdByUserId: userIdColumn("created_by_user_id"),
  ...timestamps(),
  archivedAt: timestamp("archived_at"),
});

export const submissions = pgTable("submissions", {
  id: idColumn(),
  workspaceId: workspaceIdColumn(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidates.id),
  ownerUserId: userIdColumn("owner_user_id"),
  stage: submissionStageEnum("stage").notNull().default("sourced"),
  riskFlag: riskFlagEnum("risk_flag").notNull().default("none"),
  nextStep: text("next_step"),
  submittedAt: timestamp("submitted_at"),
  lastTouchAt: timestamp("last_touch_at"),
  latestFeedbackAt: timestamp("latest_feedback_at"),
  lostReason: text("lost_reason"),
  offerAmount: integer("offer_amount"),
  currency: varchar("currency", { length: 8 }),
  createdByUserId: userIdColumn("created_by_user_id"),
  ...timestamps(),
});

export const tasks = pgTable("tasks", {
  id: idColumn(),
  workspaceId: workspaceIdColumn(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("open"),
  dueAt: timestamp("due_at"),
  snoozedUntil: timestamp("snoozed_until"),
  assignedToUserId: userIdColumn("assigned_to_user_id"),
  createdByUserId: userIdColumn("created_by_user_id"),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: uuid("entity_id"),
  submissionId: uuid("submission_id").references(() => submissions.id),
  completedAt: timestamp("completed_at"),
  ...timestamps(),
});

export const notes = pgTable("notes", {
  id: idColumn(),
  workspaceId: workspaceIdColumn(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id"),
  body: text("body").notNull(),
  visibility: varchar("visibility", { length: 20 })
    .notNull()
    .default("workspace"),
  createdByUserId: userIdColumn("created_by_user_id"),
  ...timestamps(),
});

export const documents = pgTable("documents", {
  id: idColumn(),
  workspaceId: workspaceIdColumn(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: uuid("entity_id"),
  type: documentTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  storageKey: text("storage_key"),
  mimeType: varchar("mime_type", { length: 255 }),
  sizeBytes: integer("size_bytes"),
  sourceFilename: varchar("source_filename", { length: 255 }),
  uploadedByUserId: userIdColumn("uploaded_by_user_id"),
  summaryStatus: automationStatusEnum("summary_status")
    .notNull()
    .default("queued"),
  summaryText: text("summary_text"),
  embeddingStatus: automationStatusEnum("embedding_status")
    .notNull()
    .default("queued"),
  ...timestamps(),
});

export const automationRuns = pgTable("automation_runs", {
  id: idColumn(),
  workspaceId: workspaceIdColumn(),
  type: automationTypeEnum("type").notNull(),
  status: automationStatusEnum("status").notNull().default("queued"),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: uuid("entity_id"),
  documentId: uuid("document_id").references(() => documents.id),
  attemptCount: integer("attempt_count").notNull().default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  ...timestamps(),
});

export const auditLogs = pgTable("audit_logs", {
  id: idColumn(),
  workspaceId: workspaceIdColumn(),
  actorUserId: userIdColumn("actor_user_id"),
  action: varchar("action", { length: 120 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: uuid("entity_id"),
  metadataJson: jsonb("metadata_json"),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
}));

// `memberships` are records where the user is the member.
// `invitedMemberships` are records where the user invited that member.
// Keep this separate from `invitationsSent`, which tracks pending invitation rows.
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(teamMembers, {
    relationName: "membershipUser",
  }),
  invitedMemberships: many(teamMembers, {
    relationName: "membershipInviter",
  }),
  invitationsSent: many(invitations),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    relationName: "membershipUser",
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  invitedByUser: one(users, {
    relationName: "membershipInviter",
    fields: [teamMembers.invitedByUserId],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;
export type ClientContact = typeof clientContacts.$inferSelect;
export type NewClientContact = typeof clientContacts.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type JobStage = typeof jobStages.$inferSelect;
export type NewJobStage = typeof jobStages.$inferInsert;
export type Candidate = typeof candidates.$inferSelect;
export type NewCandidate = typeof candidates.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type AutomationRun = typeof automationRuns.$inferSelect;
export type NewAutomationRun = typeof automationRuns.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

type MemberIdentity = Pick<User, "id" | "name" | "email">;

export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: MemberIdentity;
  })[];
};

export type Workspace = Team;
export type NewWorkspace = NewTeam;
export type Membership = TeamMember;
export type NewMembership = NewTeamMember;
export type WorkspaceDataWithMembers = Workspace & {
  memberships: (Membership & {
    user: MemberIdentity;
  })[];
};

export const auditEntityTypeValues = [
  "workspace",
  "membership",
  "client",
  "client_contact",
  "job",
  "candidate",
  "submission",
  "task",
  "note",
  "document",
  "automation_run",
] as const;

export type AuditEntityType = (typeof auditEntityTypeValues)[number];

export enum AuditAction {
  WORKSPACE_CREATED = "WORKSPACE_CREATED",
  MEMBER_INVITED = "MEMBER_INVITED",
  MEMBER_JOINED = "MEMBER_JOINED",
  MEMBER_REMOVED = "MEMBER_REMOVED",
  BILLING_CHECKOUT_STARTED = "BILLING_CHECKOUT_STARTED",
  BILLING_PORTAL_OPENED = "BILLING_PORTAL_OPENED",
  BILLING_SUBSCRIPTION_SYNCED = "BILLING_SUBSCRIPTION_SYNCED",
  CLIENT_CREATED = "CLIENT_CREATED",
  CLIENT_UPDATED = "CLIENT_UPDATED",
  CLIENT_ARCHIVED = "CLIENT_ARCHIVED",
  CLIENT_RESTORED = "CLIENT_RESTORED",
  CLIENT_CONTACT_CREATED = "CLIENT_CONTACT_CREATED",
  CLIENT_CONTACT_UPDATED = "CLIENT_CONTACT_UPDATED",
  CANDIDATE_CREATED = "CANDIDATE_CREATED",
  CANDIDATE_UPDATED = "CANDIDATE_UPDATED",
  DOCUMENT_LINKED = "DOCUMENT_LINKED",
  DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED",
  JOB_CREATED = "JOB_CREATED",
  JOB_UPDATED = "JOB_UPDATED",
  JOB_STATUS_CHANGED = "JOB_STATUS_CHANGED",
  JOB_STAGE_TEMPLATE_INITIALIZED = "JOB_STAGE_TEMPLATE_INITIALIZED",
  ACCOUNT_UPDATED = "ACCOUNT_UPDATED",
  PASSWORD_UPDATED = "PASSWORD_UPDATED",
  ACCOUNT_DELETED = "ACCOUNT_DELETED",
  SIGN_IN = "SIGN_IN",
  SIGN_OUT = "SIGN_OUT",
}

export enum ActivityType {
  SIGN_UP = "SIGN_UP",
  SIGN_IN = "SIGN_IN",
  SIGN_OUT = "SIGN_OUT",
  UPDATE_PASSWORD = "UPDATE_PASSWORD",
  DELETE_ACCOUNT = "DELETE_ACCOUNT",
  UPDATE_ACCOUNT = "UPDATE_ACCOUNT",
  CREATE_TEAM = "CREATE_TEAM",
  REMOVE_TEAM_MEMBER = "REMOVE_TEAM_MEMBER",
  INVITE_TEAM_MEMBER = "INVITE_TEAM_MEMBER",
  ACCEPT_INVITATION = "ACCEPT_INVITATION",
}
