"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE_NAME } from "@recruitflow/config";
import {
  authAccountDeleteRequestSchema,
  type AuthAccountDeleteResponse,
} from "@recruitflow/contracts";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";
import { validatedActionWithUser } from "@/lib/auth/middleware";

export const deleteAccount = validatedActionWithUser(
  authAccountDeleteRequestSchema,
  async (data) => {
    const { password } = data;

    try {
      await requestApiJson<AuthAccountDeleteResponse>("/auth/account", {
        method: "DELETE",
        json: {
          password,
        },
      });
    } catch (error) {
      if (isApiRequestError(error)) {
        return {
          password,
          error: error.message,
        };
      }

      throw error;
    }

    (await cookies()).delete(SESSION_COOKIE_NAME);
    redirect("/sign-in");
  },
);
