import { z } from "zod";
import { redirect } from "next/navigation";

import type { User, WorkspaceDataWithMembers } from "@/lib/db/schema";
import {
  getUser,
  isWorkspaceAccessError,
  requireRole,
  requireWorkspace,
  type RoleRequirement,
  type WorkspaceContext,
} from "@/lib/db/queries";

export type ActionState = {
  error?: string;
  success?: string;
  [key: string]: any;
};

type ValidatedActionFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
) => Promise<T>;

export const validatedAction = <S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>,
) => {
  return async (_prevState: ActionState, formData: FormData) => {
    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0].message };
    }

    return action(result.data, formData);
  };
};

type ValidatedActionWithUserFunction<S extends z.ZodType<any, any>, T> = (
  data: z.infer<S>,
  formData: FormData,
  user: User,
) => Promise<T>;

export const validatedActionWithUser = <S extends z.ZodType<any, any>, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>,
) => {
  return async (_prevState: ActionState, formData: FormData) => {
    const user = await getUser();
    if (!user) {
      throw new Error("User is not authenticated");
    }

    const result = schema.safeParse(Object.fromEntries(formData));
    if (!result.success) {
      return { error: result.error.errors[0].message };
    }

    return action(result.data, formData, user);
  };
};

type ActionWithWorkspaceFunction<T> = (
  formData: FormData,
  workspace: WorkspaceDataWithMembers,
) => Promise<T>;

export const withWorkspace = <T>(action: ActionWithWorkspaceFunction<T>) => {
  return async (formData: FormData): Promise<T> => {
    try {
      const { workspace } = await requireWorkspace();
      return action(formData, workspace);
    } catch (error) {
      if (
        isWorkspaceAccessError(error) &&
        error.code === "UNAUTHENTICATED"
      ) {
        redirect("/sign-in");
      }

      throw error;
    }
  };
};

type ActionWithRoleFunction<T> = (
  formData: FormData,
  context: WorkspaceContext,
) => Promise<T>;

export const withRole = <T>(
  requirement: RoleRequirement,
  action: ActionWithRoleFunction<T>,
) => {
  return async (formData: FormData): Promise<T> => {
    try {
      const context = await requireRole(requirement);
      return action(formData, context);
    } catch (error) {
      if (
        isWorkspaceAccessError(error) &&
        error.code === "UNAUTHENTICATED"
      ) {
        redirect("/sign-in");
      }

      throw error;
    }
  };
};

export const withTeam = withWorkspace;
