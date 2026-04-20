import { z } from 'zod';
import { User, WorkspaceDataWithMembers } from '@/lib/db/schema';
import { getCurrentWorkspace, getUser } from '@/lib/db/queries';
import { redirect } from 'next/navigation';
export type ActionState = {
    error?: string;
    success?: string;
    [key: string]: any; // This allows for additional properties
};
type ValidatedActionFunction<S extends z.ZodType<any, any>, T> = (data: z.infer<S>, formData: FormData) => Promise<T>;
export const validatedAction = <S extends z.ZodType<any, any>, T>(schema: S, action: ValidatedActionFunction<S, T>) => {
    return async (prevState: ActionState, formData: FormData) => {
        const result = schema.safeParse(Object.fromEntries(formData));
        if (!result.success) {
            return { error: result.error.errors[0].message };
        }
        return action(result.data, formData);
    };
};
type ValidatedActionWithUserFunction<S extends z.ZodType<any, any>, T> = (data: z.infer<S>, formData: FormData, user: User) => Promise<T>;
export const validatedActionWithUser = <S extends z.ZodType<any, any>, T>(schema: S, action: ValidatedActionWithUserFunction<S, T>) => {
    return async (prevState: ActionState, formData: FormData) => {
        const user = await getUser();
        if (!user) {
            throw new Error('User is not authenticated');
        }
        const result = schema.safeParse(Object.fromEntries(formData));
        if (!result.success) {
            return { error: result.error.errors[0].message };
        }
        return action(result.data, formData, user);
    };
};
type ActionWithWorkspaceFunction<T> = (formData: FormData, workspace: WorkspaceDataWithMembers) => Promise<T>;
export const withWorkspace = <T>(action: ActionWithWorkspaceFunction<T>) => {
    return async (formData: FormData): Promise<T> => {
        const user = await getUser();
        if (!user) {
            redirect('/sign-in');
        }
        const workspace = await getCurrentWorkspace();
        if (!workspace) {
            throw new Error('Workspace not found');
        }
        return action(formData, workspace);
    };
};
export const withTeam = withWorkspace;
