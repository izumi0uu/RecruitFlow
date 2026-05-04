import type { ApiTaskStatus } from "@recruitflow/contracts";

import type { WorkspaceRole } from "@/lib/db/schema";

type TaskPermissionActor = {
  role: WorkspaceRole;
  userId: string;
};

type TaskPermissionTarget = {
  assignedToUserId: string | null;
  status: ApiTaskStatus;
};

const taskManagerRoles = new Set<WorkspaceRole>(["owner", "recruiter"]);

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
  target: TaskPermissionTarget,
) => {
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
