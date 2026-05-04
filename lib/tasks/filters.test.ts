import assert from "node:assert/strict";

import {
  areTaskListFiltersEqual,
  normalizeTaskListFilters,
  parseTaskListFiltersFromRecord,
  taskListFiltersToSearchParams,
} from "./filters";

const clientId = "11111111-1111-4111-8111-111111111111";
const ownerId = "22222222-2222-4222-8222-222222222222";

const normalized = normalizeTaskListFilters({
  entityId: clientId,
  entityType: "client",
  owner: ownerId,
  page: "3",
  q: "  feedback loop  ",
  status: "snoozed",
  view: "workspace",
});

assert.deepEqual(normalized, {
  entityId: clientId,
  entityType: "client",
  owner: ownerId,
  page: "3",
  q: "feedback loop",
  status: "snoozed",
  view: "workspace",
});

assert.deepEqual(
  normalizeTaskListFilters({
    entityId: "not-a-uuid",
    entityType: "invoice",
    owner: "also-not-a-uuid",
    page: "1",
    q: "  ",
    status: "blocked",
    view: "everything",
  }),
  {
    entityId: "",
    entityType: "",
    owner: "",
    page: "",
    q: "",
    status: "",
    view: "mine",
  },
);

assert.deepEqual(
  parseTaskListFiltersFromRecord({
    entityId: [clientId, "33333333-3333-4333-8333-333333333333"],
    entityType: ["submission", "client"],
    owner: [ownerId],
    page: ["2"],
    q: ["candidate"],
    status: ["done"],
    view: ["done"],
  }),
  {
    entityId: clientId,
    entityType: "submission",
    owner: ownerId,
    page: "2",
    q: "candidate",
    status: "done",
    view: "done",
  },
);

const params = taskListFiltersToSearchParams(normalized, {
  includePageSize: true,
});

assert.equal(params.get("view"), "workspace");
assert.equal(params.get("q"), "feedback loop");
assert.equal(params.get("owner"), ownerId);
assert.equal(params.get("entityType"), "client");
assert.equal(params.get("entityId"), clientId);
assert.equal(params.get("status"), "snoozed");
assert.equal(params.get("page"), "3");
assert.equal(params.get("pageSize"), "20");

assert.equal(
  taskListFiltersToSearchParams(normalizeTaskListFilters({ view: "mine" })).has(
    "view",
  ),
  false,
);

assert.equal(areTaskListFiltersEqual(normalized, { ...normalized }), true);
assert.equal(
  areTaskListFiltersEqual(normalized, { ...normalized, view: "mine" }),
  false,
);
