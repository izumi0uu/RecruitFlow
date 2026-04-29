"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME } from "@recruitflow/config";

import { setSession } from "@/lib/auth/session";

import {
  DEV_ACCOUNT_SWITCHER_ENABLED,
  DEV_TEST_ACCOUNTS,
  type DevTestAccountKey,
} from "./test-account-definitions";
import { ensureDevTestAccounts, getDevTestAccount } from "./test-accounts";

type DevToolState = {
  error?: string;
  success?: string;
};

const assertDevToolsEnabled = () => {
  if (!DEV_ACCOUNT_SWITCHER_ENABLED)
    throw new Error(
      "Development account tools are disabled outside development.",
    );
};

const normalizeRedirectTarget = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string" || !value.startsWith("/")) return "/dashboard";

  return value;
};

const toAccountKey = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") return null;

  const definition = DEV_TEST_ACCOUNTS.find((account) => account.key === value);
  return definition?.key ?? null;
};

export const ensureDevTestAccountsAction = async (
  _prevState: DevToolState,
  _formData: FormData,
) => {
  try {
    assertDevToolsEnabled();
    const accounts = await ensureDevTestAccounts();

    return {
      success: `Ready: ${accounts.length} development accounts are available.`,
    } satisfies DevToolState;
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to prepare development accounts.",
    } satisfies DevToolState;
  }
};

export const switchDevAccountAction = async (formData: FormData) => {
  assertDevToolsEnabled();

  const accountKey = toAccountKey(formData.get("accountKey"));
  if (!accountKey) throw new Error("Invalid development account selection.");

  const redirectTo = normalizeRedirectTarget(formData.get("redirectTo"));
  const { user } = await getDevTestAccount(accountKey as DevTestAccountKey);

  await setSession(user);
  redirect(redirectTo);
};

export const clearDevSessionAction = async (formData: FormData) => {
  assertDevToolsEnabled();

  const redirectTo = normalizeRedirectTarget(formData.get("redirectTo"));
  (await cookies()).delete(SESSION_COOKIE_NAME);
  redirect(redirectTo);
};
