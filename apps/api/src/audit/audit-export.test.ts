import assert from "node:assert/strict";

import {
  type AuditExportRow,
  buildAuditExportCsv,
  buildAuditExportFilterMetadata,
  summarizeAuditMetadata,
} from "./audit-export";

assert.equal(
  summarizeAuditMetadata({
    actorRole: "owner",
    filters: {
      action: "WORKSPACE_UPDATED",
      actorUserId: "11111111-1111-4111-8111-111111111111",
      secret: "do-not-export",
    },
    rawToken: "sensitive",
    rowCount: 3,
    source: "api",
  }),
  "actorRole: owner | filters: action=WORKSPACE_UPDATED; actorUserId=11111111-1111-4111-8111-111111111111 | rowCount: 3 | source: api",
);

const csv = buildAuditExportCsv([
  {
    action: "WORKSPACE_UPDATED",
    actorEmail: "owner@example.com",
    actorName: "=Owner",
    actorUserId: "11111111-1111-4111-8111-111111111111",
    createdAt: new Date("2026-05-06T12:00:00.000Z"),
    entityId: "22222222-2222-4222-8222-222222222222",
    entityType: "workspace",
    id: "33333333-3333-4333-8333-333333333333",
    ipAddress: "127.0.0.1",
    metadataJson: {
      actorRole: "owner",
      secret: "should-not-appear",
      sourceSurface: "settings_audit",
    },
  } satisfies AuditExportRow,
]).toString("utf8");

assert.equal(csv.includes("secret"), false);
assert.equal(csv.includes("should-not-appear"), false);
assert.equal(csv.includes('"\'=Owner"'), true);
assert.equal(csv.includes("sourceSurface: settings_audit"), true);

assert.deepEqual(
  buildAuditExportFilterMetadata({
    action: "WORKSPACE_UPDATED",
    endDate: "2026-05-06",
    startDate: "2026-05-01",
  }),
  {
    action: "WORKSPACE_UPDATED",
    actorUserId: null,
    endDate: "2026-05-06",
    entityType: null,
    startDate: "2026-05-01",
  },
);
