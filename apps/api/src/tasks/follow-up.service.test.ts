import { strict as assert } from "node:assert";
import {
  apiFollowUpReasonValues,
  apiFollowUpSeverityValues,
  apiFollowUpSourceTypeValues,
  apiSubmissionStageCadenceDefaults,
} from "@recruitflow/contracts";

assert.equal(apiSubmissionStageCadenceDefaults.sourced.active, true);
assert.equal(apiSubmissionStageCadenceDefaults.sourced.days, 7);
assert.equal(apiSubmissionStageCadenceDefaults.screening.days, 3);
assert.equal(apiSubmissionStageCadenceDefaults.submitted.days, 3);
assert.equal(apiSubmissionStageCadenceDefaults.client_interview.days, 2);
assert.equal(apiSubmissionStageCadenceDefaults.offer.days, 1);
assert.equal(apiSubmissionStageCadenceDefaults.placed.active, false);
assert.equal(apiSubmissionStageCadenceDefaults.placed.days, null);
assert.equal(apiSubmissionStageCadenceDefaults.lost.active, false);
assert.equal(apiSubmissionStageCadenceDefaults.lost.days, null);

assert.deepEqual(apiFollowUpReasonValues, [
  "task_overdue",
  "task_due_today",
  "snooze_returned",
  "submission_stale",
  "high_risk_without_next_step",
  "cadence_due",
  "suggested_by_automation",
]);
assert.deepEqual(apiFollowUpSeverityValues, [
  "critical",
  "high",
  "normal",
  "low",
]);
assert.deepEqual(apiFollowUpSourceTypeValues, [
  "task",
  "snoozed_task",
  "stale_submission",
  "risk_signal",
  "reminder_suggestion",
]);

console.log("follow-up contract and cadence defaults pass");
