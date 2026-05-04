import assert from "node:assert/strict";

import { canDeleteNote } from "./notes.permissions";

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

assert.equal(canDeleteNote(owner, activeOtherNote), true);
assert.equal(canDeleteNote(recruiter, activeOtherNote), true);
assert.equal(canDeleteNote(coordinator, activeOwnNote), true);
assert.equal(canDeleteNote(coordinator, activeOtherNote), false);
assert.equal(canDeleteNote(coordinator, archivedOwnNote), true);
