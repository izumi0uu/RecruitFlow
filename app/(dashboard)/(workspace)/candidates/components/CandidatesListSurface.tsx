"use client";

import type { ReactNode } from "react";
import {
  FileText,
  Pencil,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  UserRound,
} from "lucide-react";

import type { CandidatesListItem } from "@recruitflow/contracts";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Input } from "@/components/ui/Input";
import {
  WorkspaceListStatusBadge,
  WorkspaceListSurfaceShell,
} from "@/components/workspace/WorkspaceListSurfaceShell";
import { WorkspacePageHeaderSummary } from "@/components/workspace/WorkspacePageHeaderSummary";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import type { CandidateListFilters } from "@/lib/candidates/filters";
import { cn } from "@/lib/utils";

import { useCandidatesListSurface } from "./hooks/useCandidatesListSurface";

type CandidatesListSurfaceProps = {
  initialFilters: CandidateListFilters;
};

const hasResumeOptions = [
  { label: "Has resume", value: "true" },
  { label: "Needs resume", value: "false" },
] as const;

const CandidateBadge = ({
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

const formatCandidateFocus = (candidate: CandidatesListItem) => {
  const parts = [
    candidate.currentTitle,
    candidate.currentCompany,
    candidate.location,
  ].filter(Boolean);

  return parts.join(" at ") || candidate.headline || "Profile baseline pending";
};

const CandidateRow = ({ candidate }: { candidate: CandidatesListItem }) => {
  const ownerLabel =
    candidate.owner?.name ?? candidate.owner?.email ?? "Unassigned";

  return (
    <article className="grid gap-4 border-t border-border/60 px-4 py-4 first:border-t-0 md:px-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(10rem,0.44fr)_minmax(9rem,0.34fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <CandidateBadge
            className={
              candidate.hasResume
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            }
          >
            <FileText className="mr-1 size-3.5" />
            {candidate.hasResume ? "Resume ready" : "Resume missing"}
          </CandidateBadge>
          {candidate.source ? (
            <CandidateBadge className="border-border/70 bg-surface-1 text-muted-foreground">
              {candidate.source}
            </CandidateBadge>
          ) : null}
        </div>

        <h2 className="mt-3 truncate text-lg font-semibold tracking-[-0.04em] text-foreground">
          <TrackedLink
            className="transition hover:text-primary"
            href={`/candidates/${candidate.id}`}
          >
            {candidate.fullName}
          </TrackedLink>
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {formatCandidateFocus(candidate)}
        </p>
        {candidate.skillsText ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {candidate.skillsText}
          </p>
        ) : null}
      </div>

      <div className="min-w-0 text-sm leading-6 text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground">
          <UserRound className="size-4 text-muted-foreground" />
          <span className="truncate font-medium">{ownerLabel}</span>
        </div>
        <p className="mt-1 truncate">
          {candidate.email ?? candidate.phone ?? "No contact method captured"}
        </p>
      </div>

      <div className="min-w-0 text-sm leading-6 text-muted-foreground">
        <div className="flex items-center gap-2 text-foreground">
          <MapPin className="size-4 text-muted-foreground" />
          <span className="truncate font-medium">
            {candidate.location ?? "No location"}
          </span>
        </div>
        <p className="mt-1 truncate">
          {candidate.salaryExpectation ?? "Salary expectation pending"}
        </p>
      </div>

      <div className="flex justify-start lg:justify-end">
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <TrackedLink href={`/candidates/${candidate.id}/edit`}>
            <Pencil className="size-3.5" />
            Edit
          </TrackedLink>
        </Button>
      </div>
    </article>
  );
};

const CandidateRowsSkeleton = () => (
  <div className="divide-y divide-border/60">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="px-4 py-4 md:px-5">
        <div className="h-4 w-36 animate-pulse rounded-full bg-surface-2" />
        <div className="mt-4 h-6 w-64 max-w-full animate-pulse rounded-full bg-surface-2" />
        <div className="mt-3 h-4 w-full max-w-lg animate-pulse rounded-full bg-surface-2" />
      </div>
    ))}
  </div>
);

const CandidatesEmptyState = ({
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
        ? "No candidates match those filters"
        : "No candidates in this workspace yet"}
    </p>
    <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
      {hasFilters
        ? "Clear a filter or search for a broader profile signal to widen the candidate pool."
        : "Create a candidate profile to make the inventory useful for future document upload, submission, and AI summary workflows."}
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
        <TrackedLink href="/candidates/new">
          Create candidate
        </TrackedLink>
      </Button>
    )}
  </div>
);

export const CandidatesListSurface = ({
  initialFilters,
}: CandidatesListSurfaceProps) => {
  const {
    applyFilters,
    candidatesList,
    currentPage,
    error,
    filterCount,
    filters,
    hasFilters,
    isError,
    isFetching,
    isPending,
    locationDraft,
    refetch,
    resetFilters,
    searchDraft,
    setLocationDraft,
    setSearchDraft,
    setSourceDraft,
    sourceDraft,
    totalPages,
  } = useCandidatesListSurface({
    initialFilters,
  });
  const candidateItems = candidatesList?.items ?? [];
  const ownerOptions = candidatesList?.ownerOptions ?? [];
  const ownerFilterOptions = [
    { label: "All owners", value: "" },
    ...ownerOptions.map((owner) => ({
      label: owner.name ?? owner.email,
      value: owner.id,
    })),
  ];
  const resumeFilterOptions = [
    { label: "Any resume", value: "" },
    ...hasResumeOptions,
  ];

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="Candidate CRM"
        title="Candidates"
        description="Browse workspace-scoped candidate profiles before create, detail, document upload, and submission workflows build on this material layer."
        rightSlot={
          <WorkspacePageHeaderSummary
            actionHref="/candidates/new"
            actionLabel="Create candidate"
            role={candidatesList?.context.role ?? "..."}
            totalItems={candidatesList?.pagination.totalItems ?? "..."}
            visibleItems={candidateItems.length}
          />
        }
      />

      <WorkspaceListSurfaceShell
        filterBadges={
          <>
            <WorkspaceListStatusBadge>
              {filterCount ? `${filterCount} active filters` : "No filters"}
            </WorkspaceListStatusBadge>
            <WorkspaceListStatusBadge>
              {candidatesList?.workspaceScoped
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
        filterControlsClassName="lg:grid-cols-[minmax(0,1.16fr)_repeat(4,minmax(0,0.72fr))_auto]"
        filterControls={
          <>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Search
              </span>
              <Input
                leadingIcon={<Search className="size-4" />}
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Name, skills, title, or company"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Owner
              </span>
              <FilterSelect
                value={filters.owner}
                options={ownerFilterOptions}
                placeholder="All owners"
                onValueChange={(owner) => {
                  applyFilters({ owner, page: "" });
                }}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Source
              </span>
              <Input
                value={sourceDraft}
                onChange={(event) => setSourceDraft(event.target.value)}
                placeholder="Referral, LinkedIn..."
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Location
              </span>
              <Input
                value={locationDraft}
                onChange={(event) => setLocationDraft(event.target.value)}
                placeholder="City, state, remote"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Resume
              </span>
              <FilterSelect
                value={filters.hasResume}
                options={resumeFilterOptions}
                placeholder="Any resume"
                onValueChange={(hasResume) => {
                  applyFilters({
                    hasResume: hasResume as CandidateListFilters["hasResume"],
                    page: "",
                  });
                }}
              />
            </label>

            <div className="flex items-center gap-2">
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
          isError && candidatesList ? (
            <div className="rounded-[1.45rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  {error instanceof Error
                    ? error.message
                    : "Unable to refresh candidates."}
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
            <span>Candidate</span>
            <span>Owner</span>
            <span>Location</span>
            <span className="text-right">Action</span>
          </>
        }
        contentHeaderClassName="lg:grid-cols-[minmax(0,1.2fr)_minmax(10rem,0.44fr)_minmax(9rem,0.34fr)_auto]"
        pagination={{
          currentPage,
          disabled: !candidatesList,
          onNext: () => {
            applyFilters({ page: String(currentPage + 1) });
          },
          onPrevious: () => {
            applyFilters({
              page: currentPage > 2 ? String(currentPage - 1) : "",
            });
          },
          pageSize: candidatesList?.pagination.pageSize ?? 20,
          totalItems: candidatesList?.pagination.totalItems ?? 0,
          totalPages,
        }}
        footerNote={{
          icon: <FileText className="size-4 text-muted-foreground" />,
          title: "Candidate inventory boundary",
          children:
            "This surface owns candidate list browsing, URL-backed filters, resume readiness, and handoff points for document upload and submission workflows.",
        }}
      >
        {isError && !candidatesList ? (
          <div className="p-6">
            <div className="rounded-[1.5rem] border border-dashed border-rose-500/30 bg-rose-500/10 p-6">
              <p className="text-sm font-semibold text-foreground">
                Could not load candidates
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "The candidates API did not return a usable response."}
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
        ) : (isPending || isFetching) && candidateItems.length === 0 ? (
          <CandidateRowsSkeleton />
        ) : candidateItems.length > 0 ? (
          <div className="divide-y divide-border/60">
            {candidateItems.map((candidate) => (
              <CandidateRow key={candidate.id} candidate={candidate} />
            ))}
          </div>
        ) : (
          <div className="p-6">
            <CandidatesEmptyState
              hasFilters={hasFilters}
              onReset={resetFilters}
            />
          </div>
        )}
      </WorkspaceListSurfaceShell>
    </section>
  );
};
