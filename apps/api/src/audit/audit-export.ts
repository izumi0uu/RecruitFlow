import type { SettingsAuditListQuery } from "@recruitflow/contracts";

const csvFormulaRiskPattern = /^[=+\-@]|\t|\r|^[ ]+[=+\-@]/;

const allowedMetadataKeys = new Set([
  "actorRole",
  "changedFields",
  "entityTitle",
  "filters",
  "module",
  "rowCount",
  "source",
  "sourceSurface",
]);

const allowedFilterKeys = new Set([
  "action",
  "actorUserId",
  "endDate",
  "entityType",
  "startDate",
]);

type AuditExportRow = {
  action: string;
  actorEmail: string | null;
  actorName: string | null;
  actorUserId: string | null;
  createdAt: Date;
  entityId: string | null;
  entityType: string | null;
  id: string;
  ipAddress: string | null;
  metadataJson: unknown;
};

type AuditExportResponse = {
  body: Buffer;
  cacheControl: string;
  contentDisposition: string;
  contentType: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringifyMetadataValue = (value: unknown): string | null => {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const values = value
      .map((item) => stringifyMetadataValue(item))
      .filter((item): item is string => Boolean(item));

    return values.length ? values.join("|") : null;
  }

  return null;
};

const summarizeFilters = (filters: unknown) => {
  if (!isRecord(filters)) {
    return null;
  }

  const parts = Object.entries(filters)
    .filter(([key]) => allowedFilterKeys.has(key))
    .map(([key, value]) => {
      const summary = stringifyMetadataValue(value);

      return summary ? `${key}=${summary}` : null;
    })
    .filter((part): part is string => Boolean(part));

  return parts.length ? parts.join("; ") : null;
};

const summarizeAuditMetadata = (metadataJson: unknown) => {
  if (!isRecord(metadataJson)) {
    return "";
  }

  const parts = Object.entries(metadataJson)
    .filter(([key]) => allowedMetadataKeys.has(key))
    .map(([key, value]) => {
      const summary =
        key === "filters"
          ? summarizeFilters(value)
          : stringifyMetadataValue(value);

      return summary ? `${key}: ${summary}` : null;
    })
    .filter((part): part is string => Boolean(part));

  return parts.join(" | ");
};

const buildAttachmentDisposition = (fileName: string) => {
  const sanitizedFallback = fileName
    .replace(/[^\x20-\x7e]+/g, "_")
    .replace(/["\\]/g, "_");
  const encodedFileName = encodeURIComponent(fileName);

  return `attachment; filename="${sanitizedFallback}"; filename*=UTF-8''${encodedFileName}`;
};

const buildAuditExportFileName = () =>
  `audit-export-${new Date().toISOString().slice(0, 10)}.csv`;

const escapeCsvCell = (value: string | number | null) => {
  const rawValue = value == null ? "" : String(value);
  const safeValue = csvFormulaRiskPattern.test(rawValue)
    ? `'${rawValue}`
    : rawValue;

  return `"${safeValue.replace(/"/g, '""')}"`;
};

const buildAuditExportCsv = (rows: AuditExportRow[]) => {
  const header = [
    "createdAt",
    "action",
    "actorName",
    "actorEmail",
    "actorUserId",
    "entityType",
    "entityId",
    "ipAddress",
    "metadataSummary",
  ];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.createdAt.toISOString(),
        row.action,
        row.actorName,
        row.actorEmail,
        row.actorUserId,
        row.entityType,
        row.entityId,
        row.ipAddress,
        summarizeAuditMetadata(row.metadataJson),
      ]
        .map((value) =>
          escapeCsvCell(
            typeof value === "number" || typeof value === "string"
              ? value
              : null,
          ),
        )
        .join(","),
    ),
  ];

  return Buffer.from(`\uFEFF${lines.join("\r\n")}\r\n`, "utf8");
};

const buildAuditExportResponse = (
  rows: AuditExportRow[],
): AuditExportResponse => ({
  body: buildAuditExportCsv(rows),
  cacheControl: "private, no-store",
  contentDisposition: buildAttachmentDisposition(buildAuditExportFileName()),
  contentType: "text/csv; charset=utf-8",
});

const buildAuditExportFilterMetadata = (query: SettingsAuditListQuery) => ({
  action: query.action ?? null,
  actorUserId: query.actorUserId ?? null,
  endDate: query.endDate ?? null,
  entityType: query.entityType ?? null,
  startDate: query.startDate ?? null,
});

export {
  type AuditExportResponse,
  type AuditExportRow,
  buildAuditExportCsv,
  buildAuditExportFilterMetadata,
  buildAuditExportResponse,
  summarizeAuditMetadata,
};
