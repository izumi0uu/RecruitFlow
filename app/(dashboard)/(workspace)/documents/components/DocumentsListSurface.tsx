"use client";

import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  Bot,
  Database,
  FileText,
  Filter,
  Loader2,
  Plus,
  RotateCcw,
} from "lucide-react";

import {
  apiDocumentEntityTypeValues,
  apiDocumentTypeValues,
  type ApiAutomationStatus,
  type ApiDocumentEntityType,
  type ApiDocumentType,
  type DocumentRecord,
  type DocumentsListResponse,
} from "@recruitflow/contracts";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Input } from "@/components/ui/Input";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import {
  areDocumentListFiltersEqual,
  documentListFiltersToSearchParams,
  normalizeDocumentListFilters,
  parseDocumentListFiltersFromSearchParams,
  type DocumentListFilters,
} from "@/lib/documents/filters";
import { documentsListQueryOptions } from "@/lib/query/options";
import { cn } from "@/lib/utils";

type DocumentsListSurfaceProps = {
  initialData: DocumentsListResponse;
  initialFilters: DocumentListFilters;
};

const documentTypeLabelMap: Record<ApiDocumentType, string> = {
  call_note: "Call note",
  interview_note: "Interview note",
  jd: "Job description",
  resume: "Resume",
};

const entityTypeLabelMap: Record<ApiDocumentEntityType, string> = {
  candidate: "Candidate",
  job: "Job",
  submission: "Submission",
};

const statusToneMap: Record<ApiAutomationStatus, string> = {
  failed: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  queued: "border-border/70 bg-surface-1 text-muted-foreground",
  running: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  succeeded:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const getFilterCount = (filters: DocumentListFilters) =>
  [filters.type, filters.entityType, filters.entityId].filter(Boolean).length;

const buildUrlFromFilters = (filters: DocumentListFilters) => {
  const queryString = documentListFiltersToSearchParams(filters).toString();

  return `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const formatBytes = (value: number | null) => {
  if (value == null) {
    return "Size not captured";
  }

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 1,
    style: "unit",
    unit: value >= 1_000_000 ? "megabyte" : "kilobyte",
  }).format(value >= 1_000_000 ? value / 1_000_000 : value / 1_000);
};

const getEntityHref = (document: DocumentRecord) => {
  if (document.entityType === "candidate") {
    return `/candidates/${document.entityId}`;
  }

  if (document.entityType === "job") {
    return `/jobs/${document.entityId}`;
  }

  return null;
};

const DocumentMetric = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="min-w-0 rounded-[1rem] border border-border/70 bg-workspace-muted-surface/68 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:min-w-[6.8rem]">
    <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {label}
    </p>
    <p className="mt-1.5 text-xl font-semibold tracking-[-0.05em] text-foreground">
      {value}
    </p>
  </div>
);

const DocumentBadge = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
      className,
    )}
  >
    {children}
  </span>
);

const StatusBadge = ({
  label,
  status,
}: {
  label: string;
  status: ApiAutomationStatus;
}) => (
  <DocumentBadge className={statusToneMap[status]}>
    <Bot className="mr-1 size-3.5" />
    {label}: {status}
  </DocumentBadge>
);

const DocumentRow = ({ document }: { document: DocumentRecord }) => {
  const entityHref = getEntityHref(document);
  const entityLabel = `${entityTypeLabelMap[document.entityType]} ${document.entityId.slice(0, 8)}`;

  return (
    <article className="grid gap-4 border-t border-border/60 px-4 py-4 first:border-t-0 md:px-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(12rem,0.55fr)_minmax(12rem,0.5fr)] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <DocumentBadge className="border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300">
            <FileText className="mr-1 size-3.5" />
            {documentTypeLabelMap[document.type]}
          </DocumentBadge>
          <DocumentBadge className="border-border/70 bg-surface-1 text-muted-foreground">
            {document.mimeType ?? "MIME pending"}
          </DocumentBadge>
        </div>
        <h2 className="mt-3 truncate text-lg font-semibold tracking-[-0.04em] text-foreground">
          {document.title}
        </h2>
        <p className="mt-1 truncate text-sm leading-6 text-muted-foreground">
          {document.sourceFilename}
        </p>
        <p className="mt-1 truncate text-xs leading-5 text-muted-foreground">
          {document.storageKey}
        </p>
      </div>

      <div className="min-w-0 text-sm leading-6 text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground">
          <Database className="size-4 text-muted-foreground" />
          {entityHref ? (
            <TrackedLink
              className="truncate font-medium transition hover:text-primary"
              href={entityHref}
            >
              {entityLabel}
            </TrackedLink>
          ) : (
            <span className="truncate font-medium">{entityLabel}</span>
          )}
        </div>
        <p className="mt-1 truncate">{formatBytes(document.sizeBytes)}</p>
        <p className="mt-1 truncate">Created {formatDate(document.createdAt)}</p>
      </div>

      <div className="flex flex-wrap gap-2 lg:justify-end">
        <StatusBadge label="Summary" status={document.summaryStatus} />
        <StatusBadge label="Embedding" status={document.embeddingStatus} />
      </div>
    </article>
  );
};

const DocumentRowsSkeleton = () => (
  <div className="divide-y divide-border/60">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="px-4 py-4 md:px-5">
        <div className="h-4 w-32 animate-pulse rounded-full bg-surface-2" />
        <div className="mt-4 h-6 w-64 max-w-full animate-pulse rounded-full bg-surface-2" />
        <div className="mt-3 h-4 w-full max-w-lg animate-pulse rounded-full bg-surface-2" />
      </div>
    ))}
  </div>
);

export const DocumentsListSurface = ({
  initialData,
  initialFilters,
}: DocumentsListSurfaceProps) => {
  const [filters, setFilters] = React.useState(initialFilters);
  const [entityIdDraft, setEntityIdDraft] = React.useState(
    initialFilters.entityId,
  );
  const { data = initialData, isFetching } = useQuery({
    ...documentsListQueryOptions(filters),
    initialData,
    placeholderData: keepPreviousData,
  });
  const filterCount = getFilterCount(filters);
  const hasActiveFilters = filterCount > 0;

  React.useEffect(() => {
    setEntityIdDraft(filters.entityId);
  }, [filters.entityId]);

  React.useEffect(() => {
    const handlePopState = () => {
      setFilters(parseDocumentListFiltersFromSearchParams(
        new URLSearchParams(window.location.search),
      ));
    };

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const applyFilters = (nextFilters: Partial<DocumentListFilters>) => {
    const normalizedFilters = normalizeDocumentListFilters({
      ...filters,
      ...nextFilters,
      page: nextFilters.page ?? "",
    });

    if (areDocumentListFiltersEqual(filters, normalizedFilters)) {
      return;
    }

    setFilters(normalizedFilters);
    window.history.pushState(null, "", buildUrlFromFilters(normalizedFilters));
  };

  const handleFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    applyFilters({ entityId: entityIdDraft });
  };

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="Document operations"
        title="Documents"
        description="Browse workspace document metadata by type and linked entity before AI search, previews, and row-level document linking expand this surface."
        rightSlot={
          <div className="flex flex-col gap-3">
            <Button asChild className="rounded-full">
              <TrackedLink href="/documents/new">
                <Plus className="size-4" />
                Add metadata
              </TrackedLink>
            </Button>
            <div className="grid grid-cols-3 gap-2">
              <DocumentMetric label="Visible" value={String(data.items.length)} />
              <DocumentMetric
                label="Total"
                value={String(data.pagination.totalItems)}
              />
              <DocumentMetric label="Role" value={data.context.role} />
            </div>
          </div>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-4 md:p-5">
          <form
            className="grid gap-3 lg:grid-cols-[minmax(10rem,0.35fr)_minmax(10rem,0.35fr)_minmax(16rem,1fr)_auto]"
            onSubmit={handleFilterSubmit}
          >
            <FilterSelect
              value={filters.type}
              options={[
                { label: "All types", value: "" },
                ...apiDocumentTypeValues.map((type) => ({
                  label: documentTypeLabelMap[type],
                  value: type,
                })),
              ]}
              placeholder="All types"
              onValueChange={(type) => applyFilters({
                page: "",
                type: type as DocumentListFilters["type"],
              })}
            />

            <FilterSelect
              value={filters.entityType}
              options={[
                { label: "All entities", value: "" },
                ...apiDocumentEntityTypeValues.map((entityType) => ({
                  label: entityTypeLabelMap[entityType],
                  value: entityType,
                })),
              ]}
              placeholder="All entities"
              onValueChange={(entityType) => applyFilters({
                entityType: entityType as DocumentListFilters["entityType"],
                page: "",
              })}
            />

            <Input
              aria-label="Linked entity id"
              value={entityIdDraft}
              onChange={(event) => setEntityIdDraft(event.target.value)}
              placeholder="Linked entity id"
            />

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button type="submit" className="rounded-full">
                <Filter className="size-4" />
                Apply
              </Button>
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => applyFilters({
                    entityId: "",
                    entityType: "",
                    type: "",
                  })}
                >
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              ) : null}
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              {hasActiveFilters
                ? `${filterCount} filter${filterCount === 1 ? "" : "s"} active`
                : "Showing recent workspace document metadata"}
            </span>
            {isFetching ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-1 px-3 py-1 text-xs font-semibold text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Syncing documents
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <BadgeCheck className="size-3.5" />
                Workspace scoped
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        {isFetching && data.items.length === 0 ? (
          <DocumentRowsSkeleton />
        ) : data.items.length > 0 ? (
          <div className="divide-y divide-border/60">
            {data.items.map((document) => (
              <DocumentRow key={document.id} document={document} />
            ))}
          </div>
        ) : (
          <CardContent className="p-6">
            <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-surface-1/70 p-6">
              <p className="text-sm font-semibold text-foreground">
                {hasActiveFilters
                  ? "No documents match those filters"
                  : "No document metadata in this workspace yet"}
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {hasActiveFilters
                  ? "Clear a filter or choose a broader entity scope to inspect more document metadata."
                  : "Register metadata for a resume, job description, call note, or interview note before the AI and document-linking branches build on this material."}
              </p>
              <Button asChild variant="outline" className="mt-4 rounded-full">
                <TrackedLink href="/documents/new">
                  <Plus className="size-4" />
                  Add metadata
                </TrackedLink>
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </section>
  );
};
