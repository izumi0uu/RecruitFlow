import assert from "node:assert/strict";

import {
  buildAutomationAuditAction,
  buildAutomationDocumentStatusPatch,
  buildReminderIdempotencyKeyForTest,
  toReminderSuggestionForTest,
} from "./automation.service";

assert.deepEqual(buildAutomationDocumentStatusPatch("jd_summary"), {
  summaryStatus: "queued",
});
assert.deepEqual(buildAutomationDocumentStatusPatch("candidate_summary"), {
  summaryStatus: "queued",
});
assert.deepEqual(buildAutomationDocumentStatusPatch("document_indexing"), {
  embeddingStatus: "queued",
});
assert.equal(buildAutomationDocumentStatusPatch("reminder_generation"), null);

assert.equal(buildAutomationAuditAction("jd_summary"), "AI_SUMMARY_REQUESTED");
assert.equal(
  buildAutomationAuditAction("candidate_summary"),
  "AI_SUMMARY_REQUESTED",
);
assert.equal(
  buildAutomationAuditAction("document_indexing"),
  "EMBEDDING_REQUESTED",
);
assert.equal(
  buildAutomationAuditAction("reminder_generation"),
  "REMINDER_GENERATION_REQUESTED",
);

const reminderSuggestion = toReminderSuggestionForTest({
  assignedToEmail: "recruiter@example.com",
  assignedToName: "Riley Recruiter",
  assignedToUserId: "11111111-1111-4111-8111-111111111111",
  dueAt: new Date("2026-05-06T00:00:00.000Z"),
  entityId: "22222222-2222-4222-8222-222222222222",
  entityType: "submission",
  id: "33333333-3333-4333-8333-333333333333",
  reason: "stale_submission",
  title: "Follow up on Ada for Principal Designer",
});

assert.deepEqual(reminderSuggestion, {
  assignedTo: {
    email: "recruiter@example.com",
    id: "11111111-1111-4111-8111-111111111111",
    name: "Riley Recruiter",
  },
  assignedToUserId: "11111111-1111-4111-8111-111111111111",
  dueAt: "2026-05-06T00:00:00.000Z",
  entityId: "22222222-2222-4222-8222-222222222222",
  entityType: "submission",
  id: "33333333-3333-4333-8333-333333333333",
  reason: "stale_submission",
  suggestedTitle: "[Suggested] Follow up on Ada for Principal Designer",
  title: "Follow up on Ada for Principal Designer",
});

assert.equal(
  buildReminderIdempotencyKeyForTest("workspace-1", [
    { ...reminderSuggestion, id: "b" },
    { ...reminderSuggestion, id: "a" },
  ]),
  "reminder_generation:workspace-1:a,b",
);
assert.equal(
  buildReminderIdempotencyKeyForTest("workspace-1", []),
  "reminder_generation:workspace-1:empty",
);
