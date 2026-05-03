"use client";

import {
  type ApiAutomationStatus,
  type ApiDocumentEntityType,
  type ApiDocumentType,
  apiDocumentEntityTypeValues,
  apiDocumentTypeValues,
  type DocumentRecord,
} from "@recruitflow/contracts";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Upload,
  UserRound,
  Workflow,
} from "lucide-react";
import type { ReactNode } from "react";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Input } from "@/components/ui/Input";
import {
  WorkspaceListStatusBadge,
  WorkspaceListSurfaceShell,
} from "@/components/workspace/WorkspaceListSurfaceShell";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { WorkspacePageHeaderSummary } from "@/components/workspace/WorkspacePageHeaderSummary";
import type { DocumentListFilters } from "@/lib/documents/filters";
import {
  type ImportExportTemplateId,
  importExportTemplateDefinitions,
} from "@/lib/import-export/templates";
import { cn } from "@/lib/utils";

import { useDocumentsListSurface } from "./hooks/useDocumentsListSurface";

type DocumentsListSurfaceProps = {
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

const templateAccentMap: Record<ImportExportTemplateId, string> = {
  candidates: "from-emerald-500/80 via-sky-500/70 to-cyan-500/70",
  clients: "from-blue-500/80 via-indigo-500/70 to-fuchsia-500/65",
  documents: "from-amber-500/80 via-lime-500/65 to-emerald-500/70",
  jobs: "from-rose-500/75 via-orange-500/70 to-amber-500/75",
  "pipeline-updates": "from-violet-500/75 via-sky-500/70 to-teal-500/70",
};

const importFlowSteps = [
  { label: "Template", state: "ready" },
  { label: "Upload", state: "planned" },
  { label: "Map", state: "planned" },
  { label: "Validate", state: "planned" },
  { label: "Preview", state: "planned" },
] as const;

const documentSkeletonRowKeys = [
  "document-skeleton-one",
  "document-skeleton-two",
  "document-skeleton-three",
] as const;

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

const DocumentBadge = ({
  children,
  className,
}: {
  children: ReactNode;
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

const TemplateLibrarySurface = () => (
  <section className="overflow-hidden rounded-[2.15rem] border border-border/70 bg-background/60 shadow-[0_24px_70px_-54px_var(--shadow-color)]">
    <div className="grid gap-0 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
      <div className="p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[1.1rem] border border-border/70 bg-surface-1 text-foreground">
              <FileSpreadsheet className="size-5" />
            </span>
            <div className="min-w-0">
              <span className="inline-kicker">Import/export templates</span>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">
                Approved CSV starting points
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Static templates only: no workspace data is exported here, and
                bulk import execution stays behind a future review workflow.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-surface-1 px-3 py-2 text-xs font-semibold text-muted-foreground">
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-300" />
            Template safe
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {importExportTemplateDefinitions.map((template) => (
            <article
              key={template.id}
              className="group relative overflow-hidden rounded-[1.15rem] border border-border/70 bg-surface-1/62 p-4 transition hover:-translate-y-0.5 hover:border-primary/45"
            >
              <span
                className={cn(
                  "absolute inset-x-0 top-0 h-1 bg-gradient-to-r",
                  templateAccentMap[template.id],
                )}
              />
              <div className="flex items-start justify-between gap-3 pt-1">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {template.domain}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-foreground">
                    {template.title}
                  </h3>
                </div>
                <Button
                  asChild
                  className="h-9 shrink-0 rounded-full px-3"
                  variant="outline"
                >
                  <a
                    download={template.filename}
                    href={`/api/import-export/templates/${template.id}`}
                  >
                    <Download className="size-4" />
                    CSV
                  </a>
                </Button>
              </div>
              <p className="mt-3 min-h-10 text-sm leading-5 text-muted-foreground">
                {template.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
                <span className="rounded-full border border-border/70 bg-background/60 px-2.5 py-1">
                  {template.headers.length} columns
                </span>
                <span className="rounded-full border border-border/70 bg-background/60 px-2.5 py-1">
                  example row
                </span>
                <span className="rounded-full border border-border/70 bg-background/60 px-2.5 py-1">
                  guidance row
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>

      <aside className="border-t border-border/70 bg-workspace-muted-surface/42 p-4 md:p-5 xl:border-l xl:border-t-0">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-[1rem] border border-border/70 bg-background/70">
            <Workflow className="size-5 text-foreground" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Future import runway
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Built for mapping and validation before any database write.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {importFlowSteps.map((step, index) => (
            <div
              key={step.label}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[1rem] border border-border/70 bg-background/52 px-3 py-2.5"
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full border",
                  step.state === "ready"
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-border/70 bg-surface-1 text-muted-foreground",
                )}
              >
                {step.state === "ready" ? (
                  <CheckCircle2 className="size-4" />
                ) : (
                  <Upload className="size-3.5" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {step.label}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {step.state === "ready" ? "Available now" : "Downstream"}
                </p>
              </div>
              {index < importFlowSteps.length - 1 ? (
                <ArrowRight className="size-4 text-muted-foreground" />
              ) : (
                <ShieldCheck className="size-4 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[1rem] border border-border/70 bg-background/52 p-4">
          <p className="text-sm font-semibold text-foreground">Boundary note</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Real result-set exports and bulk imports require API ownership,
            permission checks, row-level errors, preview, and audit events.
          </p>
        </div>
      </aside>
    </div>
  </section>
);

const DocumentRow = ({ document }: { document: DocumentRecord }) => {
  const entityHref = getEntityHref(document);
  const entityLabel = `${entityTypeLabelMap[document.entityType]} ${document.entityId.slice(0, 8)}`;
  const uploadedByLabel =
    document.uploadedBy?.name ??
    document.uploadedBy?.email ??
    document.uploadedByUserId?.slice(0, 8) ??
    "Unknown uploader";

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
        <p className="mt-1 flex items-center gap-2 truncate">
          <UserRound className="size-3.5 text-muted-foreground" />
          Uploaded by {uploadedByLabel}
        </p>
        <p className="mt-1 truncate">
          Created {formatDate(document.createdAt)}
        </p>
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
    {documentSkeletonRowKeys.map((rowKey) => (
      <div key={rowKey} className="px-4 py-4 md:px-5">
        <div className="h-4 w-32 animate-pulse rounded-full bg-surface-2" />
        <div className="mt-4 h-6 w-64 max-w-full animate-pulse rounded-full bg-surface-2" />
        <div className="mt-3 h-4 w-full max-w-lg animate-pulse rounded-full bg-surface-2" />
      </div>
    ))}
  </div>
);

const DocumentsEmptyState = ({
  hasFilters,
  onReset,
}: {
  hasFilters: boolean;
  onReset: () => void;
}) => (
  <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-surface-1/70 p-6 text-center">
    <span className="mx-auto flex size-14 items-center justify-center rounded-[1.35rem] border border-border/70 bg-background/70">
      <FileText className="size-5 text-foreground" />
    </span>
    <p className="mt-5 text-sm font-semibold text-foreground">
      {hasFilters
        ? "No documents match those filters"
        : "No document metadata in this workspace yet"}
    </p>
    <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
      {hasFilters
        ? "Clear a filter or choose a broader entity scope to inspect more document metadata."
        : "Register metadata for a resume, job description, call note, or interview note before the AI and document-linking branches build on this material."}
    </p>
    {hasFilters ? (
      <Button
        type="button"
        variant="outline"
        className="mt-4 rounded-full"
        onClick={onReset}
      >
        <RotateCcw className="size-4" />
        Reset filters
      </Button>
    ) : (
      <Button asChild variant="outline" className="mt-4 rounded-full">
        <TrackedLink href="/documents/new">Add metadata</TrackedLink>
      </Button>
    )}
  </div>
);

export const DocumentsListSurface = ({
  initialFilters,
}: DocumentsListSurfaceProps) => {
  const {
    applyFilters,
    currentPage,
    documentsList,
    entityIdDraft,
    error,
    filterCount,
    filters,
    hasFilters,
    isError,
    isFetching,
    isPending,
    refetch,
    resetFilters,
    setEntityIdDraft,
    totalPages,
  } = useDocumentsListSurface({
    initialFilters,
  });
  const documentItems = documentsList?.items ?? [];

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="Document operations"
        title="Documents"
        description="Browse workspace document metadata by type and linked entity before AI search, previews, and row-level document linking expand this surface."
        rightSlot={
          <WorkspacePageHeaderSummary
            actionHref="/documents/new"
            actionLabel="Add metadata"
            role={documentsList?.context.role ?? "..."}
            totalItems={documentsList?.pagination.totalItems ?? "..."}
            visibleItems={documentItems.length}
          />
        }
      />

      <TemplateLibrarySurface />

      <WorkspaceListSurfaceShell
        filterBadges={
          <>
            <WorkspaceListStatusBadge>
              {filterCount ? `${filterCount} active filters` : "No filters"}
            </WorkspaceListStatusBadge>
            <WorkspaceListStatusBadge>
              {documentsList?.workspaceScoped
                ? "Workspace scoped"
                : isPending
                  ? "Loading scope"
                  : "Scope pending"}
            </WorkspaceListStatusBadge>
            {isFetching ? (
              <WorkspaceListStatusBadge>
                <Loader2 className="size-3.5 animate-spin" />
                Syncing
              </WorkspaceListStatusBadge>
            ) : null}
          </>
        }
        filterControlsClassName="lg:grid-cols-[minmax(10rem,0.35fr)_minmax(10rem,0.35fr)_minmax(16rem,1fr)_auto]"
        filterControls={
          <>
            <label className="space-y-2" htmlFor="documents-type-filter">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Type
              </span>
              <FilterSelect
                id="documents-type-filter"
                value={filters.type}
                options={[
                  { label: "All types", value: "" },
                  ...apiDocumentTypeValues.map((type) => ({
                    label: documentTypeLabelMap[type],
                    value: type,
                  })),
                ]}
                placeholder="All types"
                onValueChange={(type) => {
                  applyFilters({
                    page: "",
                    type: type as DocumentListFilters["type"],
                  });
                }}
              />
            </label>

            <label className="space-y-2" htmlFor="documents-entity-filter">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Entity
              </span>
              <FilterSelect
                id="documents-entity-filter"
                value={filters.entityType}
                options={[
                  { label: "All entities", value: "" },
                  ...apiDocumentEntityTypeValues.map((entityType) => ({
                    label: entityTypeLabelMap[entityType],
                    value: entityType,
                  })),
                ]}
                placeholder="All entities"
                onValueChange={(entityType) => {
                  applyFilters({
                    entityType: entityType as DocumentListFilters["entityType"],
                    page: "",
                  });
                }}
              />
            </label>

            <label className="space-y-2" htmlFor="documents-entity-id-filter">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Entity ID
              </span>
              <Input
                id="documents-entity-id-filter"
                value={entityIdDraft}
                onChange={(event) => setEntityIdDraft(event.target.value)}
                placeholder="Linked entity id"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                className="rounded-full"
                onClick={() => {
                  applyFilters({ entityId: entityIdDraft, page: "" });
                }}
              >
                <Filter className="size-4" />
                Apply
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={!hasFilters}
                onClick={resetFilters}
              >
                <RotateCcw className="size-4" />
                Reset
              </Button>
            </div>
          </>
        }
        alerts={
          isError && documentsList ? (
            <div className="rounded-[1.45rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  {error instanceof Error
                    ? error.message
                    : "Unable to refresh documents."}
                </p>
                <Button
                  className="rounded-full"
                  type="button"
                  variant="outline"
                  onClick={() => void refetch()}
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : null
        }
        contentHeader={
          <>
            <span>Document</span>
            <span>Entity</span>
            <span className="text-right">Automation</span>
          </>
        }
        contentHeaderClassName="lg:grid-cols-[minmax(0,1.2fr)_minmax(12rem,0.55fr)_minmax(12rem,0.5fr)]"
        pagination={{
          currentPage,
          disabled: !documentsList,
          onNext: () => {
            applyFilters({ page: String(currentPage + 1) });
          },
          onPrevious: () => {
            applyFilters({
              page: currentPage > 2 ? String(currentPage - 1) : "",
            });
          },
          pageSize: documentsList?.pagination.pageSize ?? 20,
          totalItems: documentsList?.pagination.totalItems ?? 0,
          totalPages,
        }}
        footerNote={{
          icon: <FileText className="size-4 text-muted-foreground" />,
          title: "Document metadata boundary",
          children:
            "This surface owns workspace-scoped document metadata browsing, linked entity filters, and AI processing status visibility before previews and semantic search expand the document workflow.",
        }}
      >
        {isError && !documentsList ? (
          <div className="p-6">
            <div className="rounded-[1.5rem] border border-dashed border-rose-500/30 bg-rose-500/10 p-6">
              <p className="text-sm font-semibold text-foreground">
                Could not load documents
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "The documents API did not return a usable response."}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 rounded-full"
                onClick={() => {
                  void refetch();
                }}
              >
                <RotateCcw className="size-4" />
                Retry
              </Button>
            </div>
          </div>
        ) : (isPending || isFetching) && documentItems.length === 0 ? (
          <DocumentRowsSkeleton />
        ) : documentItems.length > 0 ? (
          <div className="divide-y divide-border/60">
            {documentItems.map((document) => (
              <DocumentRow key={document.id} document={document} />
            ))}
          </div>
        ) : (
          <div className="p-6">
            <DocumentsEmptyState
              hasFilters={hasFilters}
              onReset={resetFilters}
            />
          </div>
        )}
      </WorkspaceListSurfaceShell>
    </section>
  );
};
