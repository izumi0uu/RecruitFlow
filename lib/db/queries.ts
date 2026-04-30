import { and, desc, eq, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { SESSION_COOKIE_NAME } from "@recruitflow/config";
import { cookies } from "next/headers";

// TODO(api-boundary): This file is a legacy web-side read compatibility layer.
// Do not add new CRM business queries here; add Nest API services/adapters first.
import { db } from "./drizzle";
import {
  activityLogs,
  auditLogs,
  candidates,
  clients,
  documents,
  jobs,
  type Membership,
  submissions,
  tasks,
  teamMembers,
  teams,
  users,
  type TeamDataWithMembers,
  type User,
  type Workspace,
  type WorkspaceDataWithMembers,
  type WorkspaceRole,
  workspaceRoleValues,
} from "./schema";

import { verifyToken } from "@/lib/auth/session";

const toWorkspaceData = (
  team: TeamDataWithMembers,
): WorkspaceDataWithMembers => ({
  ...team,
  memberships: team.teamMembers.map((membership) => ({
    ...membership,
  })),
});

type CurrentUser = Omit<User, "passwordHash">;

export type CurrentMembership = Membership & {
  workspace: Workspace;
};

export type WorkspaceContext = {
  membership: CurrentMembership;
  user: CurrentUser;
  workspace: WorkspaceDataWithMembers;
};

export type WorkspaceDemoOverview = {
  auditCount: number;
  candidateCount: number;
  clientCount: number;
  documentCount: number;
  jobCount: number;
  memberCount: number;
  openJobCount: number;
  overdueTaskCount: number;
  submissionCount: number;
  taskCount: number;
  workspaceName: string;
};

export type RoleRequirement =
  | {
      allowedRoles: WorkspaceRole[];
      minRole?: never;
    }
  | {
      allowedRoles?: never;
      minRole: WorkspaceRole;
    };

const workspaceRoleRank = Object.fromEntries(
  workspaceRoleValues.map((role, index) => [role, index]),
) as Record<WorkspaceRole, number>;

export class WorkspaceAccessError extends Error {
  code: "INSUFFICIENT_ROLE" | "NO_WORKSPACE" | "UNAUTHENTICATED";
  allowedRoles?: WorkspaceRole[];
  currentRole?: WorkspaceRole;
  minRole?: WorkspaceRole;

  constructor(options: {
    code: "INSUFFICIENT_ROLE" | "NO_WORKSPACE" | "UNAUTHENTICATED";
    message: string;
    allowedRoles?: WorkspaceRole[];
    currentRole?: WorkspaceRole;
    minRole?: WorkspaceRole;
  }) {
    super(options.message);
    this.name = "WorkspaceAccessError";
    this.code = options.code;
    this.allowedRoles = options.allowedRoles;
    this.currentRole = options.currentRole;
    this.minRole = options.minRole;
  }
}

export const isWorkspaceAccessError = (
  error: unknown,
): error is WorkspaceAccessError => error instanceof WorkspaceAccessError;

const toCurrentUser = ({ passwordHash: _passwordHash, ...currentUser }: User) =>
  currentUser;

const toCurrentMembership = (
  membership: Membership,
  workspace: Workspace,
): CurrentMembership => ({
  ...membership,
  workspace,
});

const getCurrentWorkspaceRecord = async (userId: string) => {
  return db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, userId),
    with: {
      team: {
        with: {
          teamMembers: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });
};

export const hasRequiredRole = (
  currentRole: WorkspaceRole,
  requirement: RoleRequirement,
) => {
  if (requirement.allowedRoles) {
    return requirement.allowedRoles.includes(currentRole);
  }

  return workspaceRoleRank[currentRole] <= workspaceRoleRank[requirement.minRole];
};

export const getUser = async () => {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE_NAME);
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }
  const sessionData = await verifyToken(sessionCookie.value);
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== "string"
  ) {
    return null;
  }
  if (new Date(sessionData.expires) < new Date()) {
    return null;
  }
  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);
  if (user.length === 0) {
    return null;
  }
  return user[0];
};
export const getCurrentUser = async () => {
  const user = await getUser();
  if (!user) return null;

  return toCurrentUser(user);
};
export const getTeamByStripeCustomerId = async (customerId: string) => {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
};
export const updateTeamSubscription = async (
  teamId: string,
  subscriptionData: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  },
) => {
  await db
    .update(teams)
    .set({
      ...subscriptionData,
      updatedAt: new Date(),
    })
    .where(eq(teams.id, teamId));
};
export const getUserWithTeam = async (userId: string) => {
  const result = await db
    .select({
      user: users,
      teamId: teamMembers.teamId,
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1);
  return result[0];
};
export const getActivityLogs = async () => {
  const user = await getUser();
  if (!user) {
    throw new Error("User not authenticated");
  }
  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
};

export const getCurrentWorkspace = async () => {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const result = await getCurrentWorkspaceRecord(user.id);

  if (!result?.team) {
    return null;
  }

  return toWorkspaceData(result.team);
};

export const getCurrentMembership = async () => {
  const user = await getUser();
  if (!user) {
    return null;
  }

  const result = await getCurrentWorkspaceRecord(user.id);

  if (!result?.team) {
    return null;
  }

  const { team, ...membership } = result;

  return toCurrentMembership(membership, team);
};

export const requireWorkspace = async (): Promise<WorkspaceContext> => {
  const user = await getUser();
  if (!user) {
    throw new WorkspaceAccessError({
      code: "UNAUTHENTICATED",
      message: "User is not authenticated.",
    });
  }

  const result = await getCurrentWorkspaceRecord(user.id);
  if (!result?.team) {
    throw new WorkspaceAccessError({
      code: "NO_WORKSPACE",
      message: "Current user does not belong to a workspace.",
    });
  }

  const { team, ...membership } = result;

  return {
    membership: toCurrentMembership(membership, team),
    user: toCurrentUser(user),
    workspace: toWorkspaceData(team),
  };
};

export const requireRole = async (
  requirement: RoleRequirement,
): Promise<WorkspaceContext> => {
  const context = await requireWorkspace();
  const currentRole = context.membership.role;

  if (hasRequiredRole(currentRole, requirement)) {
    return context;
  }

  throw new WorkspaceAccessError({
    code: "INSUFFICIENT_ROLE",
    message: requirement.allowedRoles
      ? `Current role must be one of: ${requirement.allowedRoles.join(", ")}.`
      : `Current role must be at least ${requirement.minRole}.`,
    allowedRoles: requirement.allowedRoles,
    currentRole,
    minRole: requirement.allowedRoles ? undefined : requirement.minRole,
  });
};

export const getTeamForUser = getCurrentWorkspace;

const countRows = async (
  table:
    | typeof clients
    | typeof jobs
    | typeof candidates
    | typeof submissions
    | typeof tasks
    | typeof documents
    | typeof auditLogs,
  workspaceId: string,
) => {
  const [result] = await db
    .select({
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(table)
    .where(eq(table.workspaceId, workspaceId));

  return result?.count ?? 0;
};

export const getWorkspaceDemoOverview =
  async (): Promise<WorkspaceDemoOverview | null> => {
    const workspace = await getCurrentWorkspace();
    if (!workspace) {
      return null;
    }

    const [jobCount, openJobCount, overdueTaskCount, clientCount, candidateCount, submissionCount, taskCount, documentCount, auditCount] =
      await Promise.all([
        countRows(jobs, workspace.id),
        db
          .select({
            count: sql<number>`cast(count(*) as int)`,
          })
          .from(jobs)
          .where(
            and(
              eq(jobs.workspaceId, workspace.id),
              inArray(jobs.status, ["intake", "open", "on_hold"]),
            ),
          )
          .then((result) => result[0]?.count ?? 0),
        db
          .select({
            count: sql<number>`cast(count(*) as int)`,
          })
          .from(tasks)
          .where(
            and(
              eq(tasks.workspaceId, workspace.id),
              ne(tasks.status, "done"),
              lt(tasks.dueAt, new Date()),
            ),
          )
          .then((result) => result[0]?.count ?? 0),
        countRows(clients, workspace.id),
        countRows(candidates, workspace.id),
        countRows(submissions, workspace.id),
        countRows(tasks, workspace.id),
        countRows(documents, workspace.id),
        countRows(auditLogs, workspace.id),
      ]);

    return {
      auditCount,
      candidateCount,
      clientCount,
      documentCount,
      jobCount,
      memberCount: workspace.memberships.length,
      openJobCount,
      overdueTaskCount,
      submissionCount,
      taskCount,
      workspaceName: workspace.name,
    };
  };
