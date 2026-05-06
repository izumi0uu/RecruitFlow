import assert from "node:assert/strict";

import {
  buildAutomationAuditAction,
  buildAutomationDocumentStatusPatch,
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
