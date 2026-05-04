import type { ApiWorkspaceRole } from "@recruitflow/contracts";

type NotePermissionContext = {
  role: ApiWorkspaceRole;
  userId: string;
};

type NotePermissionRecord = {
  archivedAt: Date | string | null;
  createdByUserId: string | null;
};

const managerNoteRoles = new Set<ApiWorkspaceRole>(["owner", "recruiter"]);

export const canDeleteNote = (
  context: NotePermissionContext,
  note: NotePermissionRecord,
) =>
  managerNoteRoles.has(context.role) || note.createdByUserId === context.userId;

export const getNoteLifecyclePermissions = (
  context: NotePermissionContext,
  note: NotePermissionRecord,
) => {
  const isArchived = Boolean(note.archivedAt);
  const canDelete = canDeleteNote(context, note);

  return {
    canArchive: !isArchived && canDelete,
    canFinalDelete: isArchived && canDelete,
  };
};
