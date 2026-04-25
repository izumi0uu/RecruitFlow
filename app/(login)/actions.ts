'use server';

import { SESSION_COOKIE_NAME } from "@recruitflow/config";
import type {
  AuthSignUpResponse,
  MemberInvitationResponse,
  MemberRemovalResponse,
} from "@recruitflow/contracts";
import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { requestApiJson, isApiRequestError } from '@/lib/api/client';
import { comparePasswords, hashPassword, setSession, setSessionToken } from '@/lib/auth/session';
import { validatedAction, validatedActionWithUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import { writeAuditLog } from '@/lib/db/audit';
import {
  AuditAction,
  User,
  users,
  teams,
  teamMembers,
  activityLogs,
  type NewActivityLog,
  ActivityType,
  workspaceRoleValues,
} from '@/lib/db/schema';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import {
    getUser,
    getUserWithTeam,
} from '@/lib/db/queries';
const logActivity = async (teamId: string | null | undefined, userId: string, type: ActivityType, ipAddress?: string) => {
    if (teamId === null || teamId === undefined) {
        return;
    }
    const newActivity: NewActivityLog = {
        teamId,
        userId,
        action: type,
        ipAddress: ipAddress || ''
    };
    await db.insert(activityLogs).values(newActivity);
};
const signInSchema = z.object({
    email: z.string().email().min(3).max(255),
    password: z.string().min(8).max(100)
});
export const signIn = validatedAction(signInSchema, async (data, formData) => {
    const { email, password } = data;
    const userWithTeam = await db
        .select({
        user: users,
        team: teams
    })
        .from(users)
        .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
        .leftJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(eq(users.email, email))
        .limit(1);
    if (userWithTeam.length === 0) {
        return {
            error: 'Invalid email or password. Please try again.',
            email,
            password
        };
    }
    const { user: foundUser, team: foundTeam } = userWithTeam[0];
    const workspaceId = foundTeam?.id;
    const isPasswordValid = await comparePasswords(password, foundUser.passwordHash);
    if (!isPasswordValid) {
        return {
            error: 'Invalid email or password. Please try again.',
            email,
            password
        };
    }
    await Promise.all([
        setSession(foundUser),
        logActivity(workspaceId, foundUser.id, ActivityType.SIGN_IN),
        writeAuditLog({
            workspaceId,
            actorUserId: foundUser.id,
            actorRole: foundUser.role,
            action: AuditAction.SIGN_IN,
            entityType: 'workspace',
            entityId: workspaceId,
            source: 'server_action',
        })
    ]);
    const redirectTo = formData.get('redirect') as string | null;
    if (redirectTo === 'checkout') {
        const priceId = formData.get('priceId') as string;
        redirect(`/api/billing/checkout?priceId=${encodeURIComponent(priceId)}`);
    }
    redirect('/dashboard');
});
const signUpSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    inviteId: z.string().optional()
});
export const signUp = validatedAction(signUpSchema, async (data, formData) => {
    const { email, password, inviteId } = data;
    try {
        const response = await requestApiJson<AuthSignUpResponse>('/auth/sign-up', {
            method: 'POST',
            json: {
                email,
                password,
                ...(inviteId ? { inviteId } : {}),
            },
        });
        await setSessionToken(response.token, response.expires);
        const redirectTo = formData.get('redirect') as string | null;
        if (redirectTo === 'checkout') {
            const priceId = formData.get('priceId') as string;
            redirect(`/api/billing/checkout?priceId=${encodeURIComponent(priceId)}`);
        }
        redirect('/dashboard');
    } catch (error) {
        if (isApiRequestError(error)) {
            return {
                error: error.message,
                email,
                password
            };
        }
        throw error;
    }
});
export const signOut = async () => {
    const user = (await getUser()) as User;
    const userWithTeam = await getUserWithTeam(user.id);
    await Promise.all([
        logActivity(userWithTeam?.teamId, user.id, ActivityType.SIGN_OUT),
        writeAuditLog({
            workspaceId: userWithTeam?.teamId,
            actorUserId: user.id,
            actorRole: user.role,
            action: AuditAction.SIGN_OUT,
            entityType: 'workspace',
            entityId: userWithTeam?.teamId,
            source: 'server_action',
        })
    ]);
    (await cookies()).delete(SESSION_COOKIE_NAME);
};
const updatePasswordSchema = z.object({
    currentPassword: z.string().min(8).max(100),
    newPassword: z.string().min(8).max(100),
    confirmPassword: z.string().min(8).max(100)
});
export const updatePassword = validatedActionWithUser(updatePasswordSchema, async (data, _, user) => {
    const { currentPassword, newPassword, confirmPassword } = data;
    const isPasswordValid = await comparePasswords(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
        return {
            currentPassword,
            newPassword,
            confirmPassword,
            error: 'Current password is incorrect.'
        };
    }
    if (currentPassword === newPassword) {
        return {
            currentPassword,
            newPassword,
            confirmPassword,
            error: 'New password must be different from the current password.'
        };
    }
    if (confirmPassword !== newPassword) {
        return {
            currentPassword,
            newPassword,
            confirmPassword,
            error: 'New password and confirmation password do not match.'
        };
    }
    const newPasswordHash = await hashPassword(newPassword);
    const userWithTeam = await getUserWithTeam(user.id);
    await Promise.all([
        db
            .update(users)
            .set({ passwordHash: newPasswordHash })
            .where(eq(users.id, user.id)),
        logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_PASSWORD)
    ]);
    return {
        success: 'Password updated successfully.'
    };
});
const deleteAccountSchema = z.object({
    password: z.string().min(8).max(100)
});
export const deleteAccount = validatedActionWithUser(deleteAccountSchema, async (data, _, user) => {
    const { password } = data;
    const isPasswordValid = await comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) {
        return {
            password,
            error: 'Incorrect password. Account deletion failed.'
        };
    }
    const userWithTeam = await getUserWithTeam(user.id);
    await logActivity(userWithTeam?.teamId, user.id, ActivityType.DELETE_ACCOUNT);
    // Soft delete
    await db
        .update(users)
        .set({
        deletedAt: sql `CURRENT_TIMESTAMP`,
        email: sql `CONCAT(email, '-', id, '-deleted')` // Ensure email uniqueness
    })
        .where(eq(users.id, user.id));
    if (userWithTeam?.teamId) {
        await db
            .delete(teamMembers)
            .where(and(eq(teamMembers.userId, user.id), eq(teamMembers.teamId, userWithTeam.teamId)));
    }
    (await cookies()).delete(SESSION_COOKIE_NAME);
    redirect('/sign-in');
});
const updateAccountSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    email: z.string().email('Invalid email address')
});
export const updateAccount = validatedActionWithUser(updateAccountSchema, async (data, _, user) => {
    const { name, email } = data;
    const userWithTeam = await getUserWithTeam(user.id);
    await Promise.all([
        db.update(users).set({ name, email }).where(eq(users.id, user.id)),
        logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_ACCOUNT)
    ]);
    return { name, success: 'Account updated successfully.' };
});
const removeTeamMemberSchema = z.object({
    memberId: z.string().uuid()
});
export const removeTeamMember = validatedActionWithUser(removeTeamMemberSchema, async (data) => {
    const { memberId } = data;
    try {
        const response = await requestApiJson<MemberRemovalResponse>(`/members/${memberId}`, {
            method: 'DELETE',
        });
        return { success: response.message };
    }
    catch (error) {
        if (isApiRequestError(error)) {
            if (error.status === 403) {
                return { error: 'Only workspace owners can remove members' };
            }
            if (error.status === 404) {
                return { error: 'Workspace member not found' };
            }
            return { error: error.message };
        }
        throw error;
    }
});
const inviteTeamMemberSchema = z.object({
    email: z.string().email('Invalid email address'),
    role: z.enum(workspaceRoleValues)
});
export const inviteTeamMember = validatedActionWithUser(inviteTeamMemberSchema, async (data) => {
    const { email, role } = data;
    try {
        const response = await requestApiJson<MemberInvitationResponse>('/members/invitations', {
            method: 'POST',
            json: {
                email,
                role,
            },
        });
        return { success: response.message };
    }
    catch (error) {
        if (isApiRequestError(error)) {
            if (error.status === 403) {
                return { error: 'Only workspace owners can invite members' };
            }
            return { error: error.message };
        }
        throw error;
    }
});
