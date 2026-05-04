import type { User, WorkspaceDataWithMembers } from "@/lib/db/schema";

type JsonPrimitive = string | number | boolean | null;

type Jsonify<T> = T extends JsonPrimitive
  ? T
  : T extends Date
    ? string
    : T extends (infer U)[]
      ? Jsonify<U>[]
      : T extends object
        ? { [K in keyof T]: Jsonify<T[K]> }
        : never;

export type CurrentUserDto = Jsonify<Omit<User, "passwordHash">> | null;
export type CurrentWorkspaceDto = Jsonify<WorkspaceDataWithMembers> | null;
export type CurrentTeamDto = CurrentWorkspaceDto;

export const toQueryDto = <T>(value: T) =>
  JSON.parse(JSON.stringify(value)) as Jsonify<T>;
