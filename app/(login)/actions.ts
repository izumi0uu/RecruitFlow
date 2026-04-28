'use server';

import { SESSION_COOKIE_NAME } from "@recruitflow/config";
import type {
  AuthAccountDeleteResponse,
  AuthAccountUpdateResponse,
  AuthPasswordUpdateResponse,
  AuthSignInResponse,
  AuthSignOutResponse,
  AuthSignUpResponse,
  MemberInvitationResponse,
  MemberRemovalResponse,
} from "@recruitflow/contracts";
import { z } from 'zod';
import { requestApiJson, isApiRequestError } from '@/lib/api/client';
import { setSessionToken } from '@/lib/auth/session';
import { validatedAction, validatedActionWithUser } from '@/lib/auth/middleware';
import {
  workspaceRoleValues,
} from '@/lib/db/schema';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

const signInSchema = z.object({
    email: z.string().email().min(3).max(255),
    password: z.string().min(8).max(100)
});
export const signIn = validatedAction(signInSchema, async (data, formData) => {
    const { email, password } = data;
    try {
        const response = await requestApiJson<AuthSignInResponse>('/auth/sign-in', {
            method: 'POST',
            json: {
                email,
                password,
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
    try {
        await requestApiJson<AuthSignOutResponse>('/auth/sign-out', {
            method: 'POST',
        });
    }
    catch (error) {
        if (!isApiRequestError(error) || error.status !== 401) {
            throw error;
        }
    }
    (await cookies()).delete(SESSION_COOKIE_NAME);
};
const updatePasswordSchema = z.object({
    currentPassword: z.string().min(8).max(100),
    newPassword: z.string().min(8).max(100),
    confirmPassword: z.string().min(8).max(100)
});
export const updatePassword = validatedActionWithUser(updatePasswordSchema, async (data, _, user) => {
    const { currentPassword, newPassword, confirmPassword } = data;
    try {
        return await requestApiJson<AuthPasswordUpdateResponse>('/auth/password', {
            method: 'PATCH',
            json: {
                confirmPassword,
                currentPassword,
                newPassword,
            },
        });
    }
    catch (error) {
        if (isApiRequestError(error)) {
            return {
                currentPassword,
                newPassword,
                confirmPassword,
                error: error.message
            };
        }
        throw error;
    }
});
const deleteAccountSchema = z.object({
    password: z.string().min(8).max(100)
});
export const deleteAccount = validatedActionWithUser(deleteAccountSchema, async (data, _, user) => {
    const { password } = data;
    try {
        await requestApiJson<AuthAccountDeleteResponse>('/auth/account', {
            method: 'DELETE',
            json: {
                password,
            },
        });
    }
    catch (error) {
        if (isApiRequestError(error)) {
            return {
                password,
                error: error.message
            };
        }
        throw error;
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
    try {
        return await requestApiJson<AuthAccountUpdateResponse>('/auth/account', {
            method: 'PATCH',
            json: {
                email,
                name,
            },
        });
    }
    catch (error) {
        if (isApiRequestError(error)) {
            return { name, error: error.message };
        }
        throw error;
    }
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
                return {
                    error: error.message === 'Forbidden resource'
                        ? 'Only workspace owners can remove members'
                        : error.message
                };
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
                return {
                    error: error.message === 'Forbidden resource'
                        ? 'Only workspace owners can invite members'
                        : error.message
                };
            }
            return { error: error.message };
        }
        throw error;
    }
});
