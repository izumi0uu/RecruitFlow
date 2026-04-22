import type { WorkspaceRole } from "@/lib/db/schema";

export const DEV_ACCOUNT_SWITCHER_ENABLED =
  process.env.NODE_ENV === "development";

export const DEV_TEST_ACCOUNT_PASSWORD = "admin123";

export type DevWorkspaceKey = "primary" | "secondary";

export type DevWorkspaceDefinition = {
  key: DevWorkspaceKey;
  name: string;
  slug: string;
  planName: string;
  subscriptionStatus: string;
  description: string;
};

export type DevTestAccountKey =
  | "ownerPrimary"
  | "recruiterPrimary"
  | "coordinatorPrimary"
  | "ownerSecondary"
  | "noWorkspace";

export type DevTestAccountDefinition = {
  key: DevTestAccountKey;
  email: string;
  name: string;
  role: WorkspaceRole;
  description: string;
  workspaceKey?: DevWorkspaceKey;
};

export const DEV_WORKSPACES: readonly DevWorkspaceDefinition[] = [
  {
    key: "primary",
    name: "Northstar Recruiting",
    slug: "northstar-recruiting",
    planName: "Plus",
    subscriptionStatus: "active",
    description: "Primary workspace for owner, recruiter, and coordinator checks.",
  },
  {
    key: "secondary",
    name: "Signal Search Partners",
    slug: "signal-search-partners",
    planName: "Base",
    subscriptionStatus: "trialing",
    description: "Separate workspace for cross-workspace isolation checks.",
  },
] as const;

export const DEV_TEST_ACCOUNTS: readonly DevTestAccountDefinition[] = [
  {
    key: "ownerPrimary",
    email: "test@test.com",
    name: "Nora Owner",
    role: "owner",
    description: "Primary workspace owner with billing and member controls.",
    workspaceKey: "primary",
  },
  {
    key: "recruiterPrimary",
    email: "recruiter@test.com",
    name: "Riley Recruiter",
    role: "recruiter",
    description: "Primary workspace recruiter for non-owner permission checks.",
    workspaceKey: "primary",
  },
  {
    key: "coordinatorPrimary",
    email: "coordinator@test.com",
    name: "Casey Coordinator",
    role: "coordinator",
    description: "Primary workspace coordinator for restricted access checks.",
    workspaceKey: "primary",
  },
  {
    key: "ownerSecondary",
    email: "second-owner@test.com",
    name: "Sage Owner",
    role: "owner",
    description: "Owner of a second workspace for tenancy boundary testing.",
    workspaceKey: "secondary",
  },
  {
    key: "noWorkspace",
    email: "orphan@test.com",
    name: "Parker Orphan",
    role: "coordinator",
    description: "Authenticated user without a workspace membership.",
  },
] as const;
