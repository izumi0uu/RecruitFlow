"use client";

import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  FileText,
  Filter,
  Pencil,
  Plus,
  Loader2,
  MapPin,
  RotateCcw,
  Search,
  UserRound,
} from "lucide-react";

import type {
  CandidatesListItem,
  CandidatesListResponse,
} from "@recruitflow/contracts";

import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Input } from "@/components/ui/Input";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import {
  areCandidateListFiltersEqual,
  candidateListFiltersToSearchParams,
  normalizeCandidateListFilters,
  parseCandidateListFiltersFromSearchParams,
  type CandidateListFilters,
} from "@/lib/candidates/filters";
import { candidatesListQueryOptions } from "@/lib/query/options";
import { cn } from "@/lib/utils";

type CandidatesListSurfaceProps = {
  initialData: CandidatesListResponse;
  initialFilters: CandidateListFilters;
};

const hasResumeOptions = [
  { label: "Has resume", value: "true" },
  { label: "Needs resume", value: "false" },
] as const;

const getFilterCount = (filters: CandidateListFilters) =>
  [
    filters.q,
    filters.owner,
    filters.source,
    filters.location,
    filters.hasResume,
  ].filter(Boolean).length;

const buildUrlFromFilters = (filters: CandidateListFilters) => {
  const queryString = candidateListFiltersToSearchParams(filters).toString();

  return `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
};

const CandidateMetric = ({
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

const CandidateBadge = ({
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

export const CandidatesListSurface = ({
  initialData,
  initialFilters,
}: CandidatesListSurfaceProps) => {
  const [filters, setFilters] = React.useState(initialFilters);
  const [locationDraft, setLocationDraft] = React.useState(
    initialFilters.location,
  );
  const [searchDraft, setSearchDraft] = React.useState(initialFilters.q);
  const [sourceDraft, setSourceDraft] = React.useState(initialFilters.source);
  const { data = initialData, isFetching } = useQuery({
    ...candidatesListQueryOptions(filters),
    initialData,
    placeholderData: keepPreviousData,
  });
  const filterCount = getFilterCount(filters);
  const hasActiveFilters = filterCount > 0;

  React.useEffect(() => {
    setLocationDraft(filters.location);
    setSearchDraft(filters.q);
    setSourceDraft(filters.source);
  }, [filters.location, filters.q, filters.source]);

  React.useEffect(() => {
    const handlePopState = () => {
      setFilters(parseCandidateListFiltersFromSearchParams(
        new URLSearchParams(window.location.search),
      ));
    };

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const applyFilters = (nextFilters: Partial<CandidateListFilters>) => {
    const normalizedFilters = normalizeCandidateListFilters({
      ...filters,
      ...nextFilters,
      page: nextFilters.page ?? "",
    });

    if (areCandidateListFiltersEqual(filters, normalizedFilters)) {
      return;
    }

    setFilters(normalizedFilters);
    window.history.pushState(null, "", buildUrlFromFilters(normalizedFilters));
  };

  const handleFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    applyFilters({
      location: locationDraft,
      q: searchDraft,
      source: sourceDraft,
    });
  };

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="Candidate CRM"
        title="Candidates"
        description="Browse workspace-scoped candidate profiles before create, detail, document upload, and submission workflows build on this material layer."
        rightSlot={
          <div className="flex flex-col gap-3">
            <Button asChild className="rounded-full">
              <TrackedLink href="/candidates/new">
                <Plus className="size-4" />
                Create candidate
              </TrackedLink>
            </Button>
            <div className="grid grid-cols-3 gap-2">
              <CandidateMetric
                label="Visible"
                value={String(data.items.length)}
              />
              <CandidateMetric
                label="Total"
                value={String(data.pagination.totalItems)}
              />
              <CandidateMetric
                label="Role"
                value={data.context.role}
              />
            </div>
          </div>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-4 md:p-5">
          <form
            className="grid gap-3 xl:grid-cols-[minmax(16rem,1fr)_minmax(10rem,0.48fr)_minmax(9rem,0.36fr)_minmax(9rem,0.36fr)_auto]"
            onSubmit={handleFilterSubmit}
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search candidates"
                className="pl-9"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Search name, skills, title, company..."
              />
            </div>

            <FilterSelect
              value={filters.owner}
              options={[
                { label: "All owners", value: "" },
                ...data.ownerOptions.map((owner) => ({
                  label: owner.name ?? owner.email,
                  value: owner.id,
                })),
              ]}
              placeholder="All owners"
              onValueChange={(owner) => applyFilters({ owner, page: "" })}
            />

            <Input
              aria-label="Source"
              value={sourceDraft}
              onChange={(event) => setSourceDraft(event.target.value)}
              placeholder="Source"
            />

            <Input
              aria-label="Location"
              value={locationDraft}
              onChange={(event) => setLocationDraft(event.target.value)}
              placeholder="Location"
            />

            <div className="flex flex-wrap gap-2 xl:justify-end">
              <FilterSelect
                value={filters.hasResume}
                options={[
                  { label: "Any resume", value: "" },
                  ...hasResumeOptions,
                ]}
                placeholder="Any resume"
                onValueChange={(hasResume) => applyFilters({
                  hasResume: hasResume as CandidateListFilters["hasResume"],
                  page: "",
                })}
              />
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
                    hasResume: "",
                    location: "",
                    owner: "",
                    q: "",
                    source: "",
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
                : "Showing the current workspace candidate inventory"}
            </span>
            {isFetching ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-surface-1 px-3 py-1 text-xs font-semibold text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Syncing candidates
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
          <CandidateRowsSkeleton />
        ) : data.items.length > 0 ? (
          <div className="divide-y divide-border/60">
            {data.items.map((candidate) => (
              <CandidateRow key={candidate.id} candidate={candidate} />
            ))}
          </div>
        ) : (
          <CardContent className="p-6">
            <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-surface-1/70 p-6">
              <p className="text-sm font-semibold text-foreground">
                {hasActiveFilters
                  ? "No candidates match those filters"
                  : "No candidates in this workspace yet"}
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {hasActiveFilters
                  ? "Clear a filter or search for a broader profile signal to widen the candidate pool."
                  : "Create a candidate profile to make the inventory useful for future document upload, submission, and AI summary workflows."}
              </p>
              <Button asChild variant="outline" className="mt-4 rounded-full">
                <TrackedLink href="/candidates/new">
                  <Plus className="size-4" />
                  Create candidate
                </TrackedLink>
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </section>
  );
};
