import assert from "node:assert/strict";

import {
  canDeleteNote,
  getNoteLifecyclePermissions,
} from "./notes.permissions";

const owner = { role: "owner", userId: "manager-1" } as const;
const recruiter = { role: "recruiter", userId: "recruiter-1" } as const;
const coordinator = { role: "coordinator", userId: "coordinator-1" } as const;

const activeOwnNote = {
  archivedAt: null,
  createdByUserId: "coordinator-1",
};
const activeOtherNote = {
  archivedAt: null,
  createdByUserId: "coordinator-2",
};
const archivedOwnNote = {
  archivedAt: "2026-05-04T04:00:00.000Z",
  createdByUserId: "coordinator-1",
};
const archivedOtherNote = {
  archivedAt: new Date("2026-05-04T04:00:00.000Z"),
  createdByUserId: "coordinator-2",
};

assert.equal(canDeleteNote(owner, activeOtherNote), true);
assert.equal(canDeleteNote(recruiter, activeOtherNote), true);
assert.equal(canDeleteNote(coordinator, activeOwnNote), true);
assert.equal(canDeleteNote(coordinator, activeOtherNote), false);

assert.deepEqual(getNoteLifecyclePermissions(coordinator, activeOwnNote), {
  canArchive: true,
  canFinalDelete: false,
});

assert.deepEqual(getNoteLifecyclePermissions(coordinator, activeOtherNote), {
  canArchive: false,
  canFinalDelete: false,
});

assert.deepEqual(getNoteLifecyclePermissions(coordinator, archivedOwnNote), {
  canArchive: false,
  canFinalDelete: true,
});

assert.deepEqual(getNoteLifecyclePermissions(owner, archivedOtherNote), {
  canArchive: false,
  canFinalDelete: true,
});
