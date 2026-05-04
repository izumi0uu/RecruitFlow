import type {
  ApiDocumentEntityType,
  ApiDocumentType,
} from "@recruitflow/contracts";

type PlaceholderDocumentInput = {
  entityId: string;
  entityType: ApiDocumentEntityType;
  mimeType: string | null;
  sourceFilename: string;
  storageKey: string | null;
  summaryText: string | null;
  title: string;
  type: ApiDocumentType;
};

type ResolvedDocumentObject = {
  body: Buffer;
  contentType: string;
  mode: "placeholder";
};

const placeholderStoragePrefix = "seed/";

const escapePdfText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const buildMinimalPdf = (lines: string[]) => {
  const contentStream = [
    "BT",
    "/F1 18 Tf",
    "72 740 Td",
    "20 TL",
    ...lines.flatMap((line) => [`(${escapePdfText(line)}) Tj`, "T*"]),
    "ET",
  ].join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");

  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
};

const buildPlaceholderLines = (document: PlaceholderDocumentInput) => [
  "RecruitFlow placeholder delivery",
  `Title: ${document.title}`,
  `Filename: ${document.sourceFilename}`,
  `Document type: ${document.type}`,
  `Linked entity: ${document.entityType} ${document.entityId}`,
  document.summaryText
    ? `Summary: ${document.summaryText.slice(0, 120)}`
    : "Summary: not generated yet",
  "This repository currently resolves seed document keys through a local placeholder delivery adapter.",
];

const isPdfDocument = (document: PlaceholderDocumentInput) =>
  document.mimeType === "application/pdf" ||
  document.sourceFilename.toLowerCase().endsWith(".pdf");

const getTextContentType = (document: PlaceholderDocumentInput) => {
  if (document.mimeType?.trim()) {
    return document.mimeType;
  }

  if (document.sourceFilename.toLowerCase().endsWith(".md")) {
    return "text/markdown; charset=utf-8";
  }

  return "text/plain; charset=utf-8";
};

const resolvePlaceholderDocument = (
  document: PlaceholderDocumentInput,
): ResolvedDocumentObject | null => {
  if (!document.storageKey?.startsWith(placeholderStoragePrefix)) {
    return null;
  }

  const lines = buildPlaceholderLines(document);

  if (isPdfDocument(document)) {
    return {
      body: buildMinimalPdf(lines),
      contentType: "application/pdf",
      mode: "placeholder",
    };
  }

  return {
    body: Buffer.from(`${lines.join("\n")}\n`, "utf8"),
    contentType: getTextContentType(document),
    mode: "placeholder",
  };
};

export { type ResolvedDocumentObject, resolvePlaceholderDocument };
