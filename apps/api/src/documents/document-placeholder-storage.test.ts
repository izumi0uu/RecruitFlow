import assert from "node:assert/strict";

import { resolvePlaceholderDocument } from "./document-placeholder-storage";

const baseDocument = {
  entityId: "11111111-1111-4111-8111-111111111111",
  entityType: "candidate" as const,
  sourceFilename: "nina-patel-resume.pdf",
  storageKey: "seed/candidates/nina-patel-resume.pdf",
  summaryText:
    "Senior recruiter profile with resume context and screening notes ready for secure placeholder delivery.",
  title: "Nina Patel Resume",
  type: "resume" as const,
};

const pdfDocument = resolvePlaceholderDocument({
  ...baseDocument,
  mimeType: "application/pdf",
});

assert.ok(pdfDocument);
assert.equal(pdfDocument.mode, "placeholder");
assert.equal(pdfDocument.contentType, "application/pdf");
assert.equal(pdfDocument.body.toString("utf8").startsWith("%PDF-1.4"), true);
assert.equal(
  pdfDocument.body
    .toString("utf8")
    .includes("RecruitFlow placeholder delivery"),
  true,
);

const markdownDocument = resolvePlaceholderDocument({
  ...baseDocument,
  mimeType: null,
  sourceFilename: "screening-notes.md",
  storageKey: "seed/candidates/screening-notes.md",
  summaryText: null,
  title: "Screening Notes",
  type: "call_note",
});

assert.ok(markdownDocument);
assert.equal(markdownDocument.contentType, "text/markdown; charset=utf-8");
assert.equal(
  markdownDocument.body.toString("utf8").includes("Summary: not generated yet"),
  true,
);
assert.equal(
  markdownDocument.body.toString("utf8").includes("Linked entity: candidate"),
  true,
);

assert.equal(
  resolvePlaceholderDocument({
    ...baseDocument,
    mimeType: "application/pdf",
    storageKey: null,
  }),
  null,
);

assert.equal(
  resolvePlaceholderDocument({
    ...baseDocument,
    mimeType: "application/pdf",
    storageKey: "workspace/candidates/nina-patel-resume.pdf",
  }),
  null,
);
