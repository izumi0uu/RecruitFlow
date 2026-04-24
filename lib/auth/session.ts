import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";

import { getAuthConfig } from "@recruitflow/config";
import { NewUser } from "@/lib/db/schema";
import {
  signSessionToken,
  type SessionData,
  verifySessionToken,
} from "@/lib/auth/session-token";

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string) => {
    return hash(password, SALT_ROUNDS);
};
export const comparePasswords = async (plainTextPassword: string, hashedPassword: string) => {
    return compare(plainTextPassword, hashedPassword);
};
export const signToken = async (payload: SessionData) => {
    return await signSessionToken(payload);
};
export const verifyToken = async (input: string) => {
    return await verifySessionToken(input);
};
export const getSession = async () => {
    const { cookieName } = getAuthConfig();
    const session = (await cookies()).get(cookieName)?.value;

    if (!session)
        return null;
    return await verifyToken(session);
};
export const setSessionToken = async (token: string, expires: string | Date) => {
    const { cookieName } = getAuthConfig();
    const expirationDate = expires instanceof Date ? expires : new Date(expires);
    (await cookies()).set(cookieName, token, {
        expires: expirationDate,
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
    });
};
export const setSession = async (user: NewUser) => {
    const expiresInOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const session: SessionData = {
        user: { id: user.id! },
        expires: expiresInOneDay.toISOString(),
    };
    const encryptedSession = await signToken(session);
    await setSessionToken(encryptedSession, expiresInOneDay);
};
