'use server';

import { SESSION_COOKIE_NAME } from "@recruitflow/config";
import type {
  AuthSignInResponse,
  AuthSignOutResponse,
  AuthSignUpResponse,
} from "@recruitflow/contracts";
import { z } from 'zod';
import { requestApiJson, isApiRequestError } from '@/lib/api/client';
import { setSessionToken } from '@/lib/auth/session';
import { validatedAction } from '@/lib/auth/middleware';
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
