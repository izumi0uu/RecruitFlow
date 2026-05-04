import type { ApiWorkspaceRole } from "@recruitflow/contracts";

type NotePermissionContext = {
  role: ApiWorkspaceRole;
  userId: string;
};

type NotePermissionRecord = {
  createdByUserId: string | null;
};

const managerNoteRoles = new Set<ApiWorkspaceRole>(["owner", "recruiter"]);

export const canDeleteNote = (
  context: NotePermissionContext,
  note: NotePermissionRecord,
) =>
  managerNoteRoles.has(context.role) || note.createdByUserId === context.userId;
