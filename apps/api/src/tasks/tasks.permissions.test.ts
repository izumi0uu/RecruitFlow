import assert from "node:assert/strict";

import {
  canCreateTaskForAssignee,
  canEditTask,
  getTaskActionPermissions,
} from "./tasks.permissions";

const coordinator = { role: "coordinator", userId: "user-1" } as const;
const recruiter = { role: "recruiter", userId: "user-2" } as const;

assert.equal(canCreateTaskForAssignee(coordinator, "user-1"), true);
assert.equal(canCreateTaskForAssignee(coordinator, "user-2"), false);
assert.equal(canCreateTaskForAssignee(recruiter, "user-1"), true);

assert.equal(canEditTask(coordinator), false);
assert.equal(canEditTask(recruiter), true);

assert.deepEqual(
  getTaskActionPermissions(coordinator, {
    assignedToUserId: "user-2",
    status: "open",
  }),
  {
    canComplete: false,
    canEdit: false,
    canReopen: false,
    canSnooze: false,
  },
);

assert.deepEqual(
  getTaskActionPermissions(coordinator, {
    assignedToUserId: "user-1",
    status: "snoozed",
  }),
  {
    canComplete: true,
    canEdit: false,
    canReopen: true,
    canSnooze: true,
  },
);

assert.deepEqual(
  getTaskActionPermissions(recruiter, {
    assignedToUserId: "user-1",
    status: "done",
  }),
  {
    canComplete: false,
    canEdit: true,
    canReopen: true,
    canSnooze: false,
  },
);
