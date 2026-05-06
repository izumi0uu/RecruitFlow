import assert from "node:assert/strict";

import {
  areDocumentListFiltersEqual,
  documentListFiltersToSearchParams,
  normalizeDocumentListFilters,
  parseDocumentListFiltersFromRecord,
  parseDocumentListFiltersFromSearchParams,
} from "./filters";

const entityId = "11111111-1111-4111-8111-111111111111";

const normalized = normalizeDocumentListFilters({
  entityId: `  ${entityId}  `,
  entityType: " candidate ",
  page: "3",
  type: " resume ",
});

assert.deepEqual(normalized, {
  entityId,
  entityType: "candidate",
  page: "3",
  type: "resume",
});

assert.deepEqual(
  normalizeDocumentListFilters({
    entityId: "not-a-uuid",
    entityType: "invoice",
    page: "1",
    type: "spreadsheet",
  }),
  {
    entityId: "",
    entityType: "",
    page: "",
    type: "",
  },
);

assert.deepEqual(
  parseDocumentListFiltersFromRecord({
    entityId: [entityId],
    entityType: ["submission", "candidate"],
    page: ["2"],
    type: ["jd"],
  }),
  {
    entityId,
    entityType: "submission",
    page: "2",
    type: "jd",
  },
);

const params = new URLSearchParams(
  documentListFiltersToSearchParams(normalized, {
    includePageSize: true,
  }),
);

assert.equal(params.get("entityId"), entityId);
assert.equal(params.get("entityType"), "candidate");
assert.equal(params.get("page"), "3");
assert.equal(params.get("pageSize"), "20");
assert.equal(params.get("type"), "resume");

assert.deepEqual(parseDocumentListFiltersFromSearchParams(params), normalized);

assert.equal(areDocumentListFiltersEqual(normalized, { ...normalized }), true);
assert.equal(
  areDocumentListFiltersEqual(normalized, { ...normalized, page: "" }),
  false,
);
