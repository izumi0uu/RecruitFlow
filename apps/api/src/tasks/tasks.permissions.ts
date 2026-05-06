import type { ApiTaskStatus } from "@recruitflow/contracts";

import type { WorkspaceRole } from "@/lib/db/schema";

type TaskPermissionActor = {
  role: WorkspaceRole;
  userId: string;
};

type TaskPermissionTarget = {
  assignedToUserId: string | null;
  status: ApiTaskStatus;
  workspaceId: string | null;
};

type TaskPermissionWorkspace = {
  workspaceId: string;
};

const taskManagerRoles = new Set<WorkspaceRole>(["owner", "recruiter"]);

export const isTaskWorkspaceScoped = (
  workspace: TaskPermissionWorkspace,
  target: Pick<TaskPermissionTarget, "workspaceId">,
) => target.workspaceId === workspace.workspaceId;

export const canManageTasks = (role: WorkspaceRole) =>
  taskManagerRoles.has(role);

export const canCreateTaskForAssignee = (
  actor: TaskPermissionActor,
  assignedToUserId: string,
) => canManageTasks(actor.role) || assignedToUserId === actor.userId;

export const canEditTask = (actor: TaskPermissionActor) =>
  canManageTasks(actor.role);

export const canUpdateTaskStatus = (
  actor: TaskPermissionActor,
  target: Pick<TaskPermissionTarget, "assignedToUserId">,
) => canManageTasks(actor.role) || target.assignedToUserId === actor.userId;

export const getTaskActionPermissions = (
  actor: TaskPermissionActor,
  workspace: TaskPermissionWorkspace,
  target: TaskPermissionTarget,
) => {
  if (!isTaskWorkspaceScoped(workspace, target)) {
    return {
      canComplete: false,
      canEdit: false,
      canReopen: false,
      canSnooze: false,
    };
  }

  const canUpdateStatus = canUpdateTaskStatus(actor, target);

  return {
    canComplete: canUpdateStatus && target.status !== "done",
    canEdit: canEditTask(actor),
    canReopen:
      canUpdateStatus &&
      (target.status === "done" || target.status === "snoozed"),
    canSnooze: canUpdateStatus && target.status !== "done",
  };
};
