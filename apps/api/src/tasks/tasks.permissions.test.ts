import assert from "node:assert/strict";

import {
  canCreateTaskForAssignee,
  canEditTask,
  getTaskActionPermissions,
  isTaskWorkspaceScoped,
} from "./tasks.permissions";

const workspace = { workspaceId: "workspace-1" } as const;
const otherWorkspaceTask = { workspaceId: "workspace-2" } as const;
const coordinator = { role: "coordinator", userId: "user-1" } as const;
const recruiter = { role: "recruiter", userId: "user-2" } as const;

assert.equal(canCreateTaskForAssignee(coordinator, "user-1"), true);
assert.equal(canCreateTaskForAssignee(coordinator, "user-2"), false);
assert.equal(canCreateTaskForAssignee(recruiter, "user-1"), true);

assert.equal(canEditTask(coordinator), false);
assert.equal(canEditTask(recruiter), true);
assert.equal(
  isTaskWorkspaceScoped(workspace, { workspaceId: "workspace-1" }),
  true,
);
assert.equal(isTaskWorkspaceScoped(workspace, otherWorkspaceTask), false);

assert.deepEqual(
  getTaskActionPermissions(coordinator, workspace, {
    assignedToUserId: "user-2",
    status: "open",
    workspaceId: "workspace-1",
  }),
  {
    canComplete: false,
    canEdit: false,
    canReopen: false,
    canSnooze: false,
  },
);

assert.deepEqual(
  getTaskActionPermissions(coordinator, workspace, {
    assignedToUserId: "user-1",
    status: "snoozed",
    workspaceId: "workspace-1",
  }),
  {
    canComplete: true,
    canEdit: false,
    canReopen: true,
    canSnooze: true,
  },
);

assert.deepEqual(
  getTaskActionPermissions(recruiter, workspace, {
    assignedToUserId: "user-1",
    status: "done",
    workspaceId: "workspace-1",
  }),
  {
    canComplete: false,
    canEdit: true,
    canReopen: true,
    canSnooze: false,
  },
);

assert.deepEqual(
  getTaskActionPermissions(recruiter, workspace, {
    assignedToUserId: "user-1",
    status: "open",
    workspaceId: "workspace-2",
  }),
  {
    canComplete: false,
    canEdit: false,
    canReopen: false,
    canSnooze: false,
  },
);
