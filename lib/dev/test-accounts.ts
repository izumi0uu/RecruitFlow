import "server-only";

import { and, eq, ne } from "drizzle-orm";

import { hashPassword } from "@/lib/auth/session";
import { db } from "@/lib/db/drizzle";
import { teamMembers, teams, users } from "@/lib/db/schema";

import {
  DEV_TEST_ACCOUNTS,
  DEV_TEST_ACCOUNT_PASSWORD,
  DEV_WORKSPACES,
  type DevTestAccountDefinition,
  type DevTestAccountKey,
  type DevWorkspaceDefinition,
  type DevWorkspaceKey,
} from "./test-account-definitions";

type DevAccountSummary = {
  key: DevTestAccountKey;
  email: string;
  role: DevTestAccountDefinition["role"];
  workspaceName: string | null;
};

const updateUserFields = (
  definition: DevTestAccountDefinition,
  passwordHash: string,
) => ({
  deletedAt: null,
  name: definition.name,
  passwordHash,
  role: definition.role,
});

const getUserByEmail = async (email: string) => {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
};

const ensureUser = async (
  definition: DevTestAccountDefinition,
  passwordHash: string,
) => {
  const existingUser = await getUserByEmail(definition.email);
  if (existingUser) {
    const [updatedUser] = await db
      .update(users)
      .set(updateUserFields(definition, passwordHash))
      .where(eq(users.id, existingUser.id))
      .returning();

    return updatedUser;
  }

  const [createdUser] = await db
    .insert(users)
    .values({
      email: definition.email,
      ...updateUserFields(definition, passwordHash),
    })
    .returning();

  return createdUser;
};

const findWorkspaceByName = async (name: string) => {
  return db.query.teams.findFirst({
    where: eq(teams.name, name),
  });
};

const findWorkspaceBySlug = async (slug: string) => {
  return db.query.teams.findFirst({
    where: eq(teams.slug, slug),
  });
};

const findWorkspaceForUser = async (userId: number) => {
  return db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, userId),
    with: {
      team: true,
    },
  });
};

const updateWorkspace = async (
  workspaceId: number,
  definition: DevWorkspaceDefinition,
) => {
  const [workspace] = await db
    .update(teams)
    .set({
      name: definition.name,
      slug: definition.slug,
      planName: definition.planName,
      subscriptionStatus: definition.subscriptionStatus,
      updatedAt: new Date(),
    })
    .where(eq(teams.id, workspaceId))
    .returning();

  return workspace;
};

const ensureWorkspace = async (
  definition: DevWorkspaceDefinition,
  preferredOwnerUserId?: number,
) => {
  const workspaceBySlug = await findWorkspaceBySlug(definition.slug);
  const workspaceByName = workspaceBySlug
    ? null
    : await findWorkspaceByName(definition.name);
  const ownerWorkspace = preferredOwnerUserId
    ? await findWorkspaceForUser(preferredOwnerUserId)
    : null;

  const preferredWorkspace =
    ownerWorkspace?.team &&
    (!workspaceBySlug || workspaceBySlug.id === ownerWorkspace.team.id)
      ? ownerWorkspace.team
      : null;

  const existingWorkspace =
    preferredWorkspace ?? workspaceBySlug ?? workspaceByName;

  if (existingWorkspace) {
    return updateWorkspace(existingWorkspace.id, definition);
  }

  const [createdWorkspace] = await db
    .insert(teams)
    .values({
      name: definition.name,
      slug: definition.slug,
      planName: definition.planName,
      subscriptionStatus: definition.subscriptionStatus,
    })
    .returning();

  return createdWorkspace;
};

const ensureMembership = async (options: {
  invitedByUserId?: number;
  role: DevTestAccountDefinition["role"];
  teamId: number;
  userId: number;
}) => {
  const existingMembership = await db.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.teamId, options.teamId),
      eq(teamMembers.userId, options.userId),
    ),
  });

  if (existingMembership) {
    const [updatedMembership] = await db
      .update(teamMembers)
      .set({
        invitedByUserId: options.invitedByUserId ?? null,
        role: options.role,
        updatedAt: new Date(),
      })
      .where(eq(teamMembers.id, existingMembership.id))
      .returning();

    return updatedMembership;
  }

  const [createdMembership] = await db
    .insert(teamMembers)
    .values({
      invitedByUserId: options.invitedByUserId,
      role: options.role,
      teamId: options.teamId,
      userId: options.userId,
    })
    .returning();

  return createdMembership;
};

const ensureExclusiveMembership = async (
  userId: number,
  allowedTeamId?: number,
) => {
  if (!allowedTeamId) {
    await db.delete(teamMembers).where(eq(teamMembers.userId, userId));
    return;
  }

  await db
    .delete(teamMembers)
    .where(
      and(
        eq(teamMembers.userId, userId),
        ne(teamMembers.teamId, allowedTeamId),
      ),
    );
};

const getDefinitionByKey = (key: DevTestAccountKey) => {
  const definition = DEV_TEST_ACCOUNTS.find((account) => account.key === key);

  if (!definition) throw new Error(`Unknown dev test account key: ${key}`);

  return definition;
};

const getWorkspaceDefinitionByKey = (key: DevWorkspaceKey) => {
  const definition = DEV_WORKSPACES.find((workspace) => workspace.key === key);

  if (!definition) {
    throw new Error(`Unknown dev workspace key: ${key}`);
  }

  return definition;
};

export const ensureDevTestAccounts = async () => {
  const passwordHash = await hashPassword(DEV_TEST_ACCOUNT_PASSWORD);

  const usersByKey = Object.fromEntries(
    await Promise.all(
      DEV_TEST_ACCOUNTS.map(async (definition) => [
        definition.key,
        await ensureUser(definition, passwordHash),
      ]),
    ),
  ) as Record<DevTestAccountKey, Awaited<ReturnType<typeof ensureUser>>>;

  const primaryWorkspace = await ensureWorkspace(
    getWorkspaceDefinitionByKey("primary"),
    usersByKey.ownerPrimary.id,
  );
  const secondaryWorkspace = await ensureWorkspace(
    getWorkspaceDefinitionByKey("secondary"),
    usersByKey.ownerSecondary.id,
  );

  const workspacesByKey = {
    primary: primaryWorkspace,
    secondary: secondaryWorkspace,
  } satisfies Record<DevWorkspaceKey, typeof primaryWorkspace>;

  for (const definition of DEV_TEST_ACCOUNTS) {
    const user = usersByKey[definition.key];

    if (!definition.workspaceKey) {
      await ensureExclusiveMembership(user.id);
      continue;
    }

    const workspace = workspacesByKey[definition.workspaceKey];
    const invitedByUserId =
      definition.key === "recruiterPrimary" ||
      definition.key === "coordinatorPrimary"
        ? usersByKey.ownerPrimary.id
        : undefined;

    await ensureMembership({
      invitedByUserId,
      role: definition.role,
      teamId: workspace.id,
      userId: user.id,
    });
    await ensureExclusiveMembership(user.id, workspace.id);
  }

  return DEV_TEST_ACCOUNTS.map(
    (definition): DevAccountSummary => ({
      email: definition.email,
      key: definition.key,
      role: definition.role,
      workspaceName: definition.workspaceKey
        ? workspacesByKey[definition.workspaceKey].name
        : null,
    }),
  );
};

export const getDevTestAccount = async (key: DevTestAccountKey) => {
  const definition = getDefinitionByKey(key);
  await ensureDevTestAccounts();

  const user = await getUserByEmail(definition.email);
  if (!user)
    throw new Error(`Dev test account ${definition.email} was not created.`);

  return { definition, user };
};
