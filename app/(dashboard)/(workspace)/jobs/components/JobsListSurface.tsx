"use client";

import type { ReactNode } from "react";
import {
  BriefcaseBusiness,
  Building2,
  Filter,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  UserRound,
} from "lucide-react";

import type { JobsListItem, JobsListResponse } from "@recruitflow/contracts";

import { Button } from "@/components/ui/Button";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Input } from "@/components/ui/Input";
import { TrackedLink } from "@/components/navigation/TrackedLink";
import {
  WorkspaceListStatusBadge,
  WorkspaceListSurfaceShell,
} from "@/components/workspace/WorkspaceListSurfaceShell";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import type { JobListFilters } from "@/lib/jobs/filters";
import { cn } from "@/lib/utils";

import { useJobsListSurface } from "./hooks/useJobsListSurface";
import {
  formatJobDate,
  formatJobLabel,
  formatJobSalary,
  jobPriorityOptions,
  jobPriorityToneMap,
  jobSortOptions,
  jobStatusOptions,
  jobStatusToneMap,
} from "../utils";

type JobsListSurfaceProps = {
  initialData: JobsListResponse;
  initialFilters: JobListFilters;
};

const JobBadge = ({
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

const JobsHeaderMetric = ({
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

const JobRow = ({
  canManageJobs,
  job,
}: {
  canManageJobs: boolean;
  job: JobsListItem;
}) => (
  <article className="grid gap-4 border-t border-border/60 px-4 py-4 first:border-t-0 md:px-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(10rem,0.46fr)_minmax(10rem,0.42fr)_minmax(8rem,0.32fr)] lg:items-center">
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <JobBadge className={jobStatusToneMap[job.status]}>
          {formatJobLabel(job.status)}
        </JobBadge>
        <JobBadge className={jobPriorityToneMap[job.priority]}>
          {formatJobLabel(job.priority)}
        </JobBadge>
        {canManageJobs ? (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="ml-auto rounded-full"
          >
            <TrackedLink href={`/jobs/${job.id}/edit`}>
              <Pencil className="size-3.5" />
            </TrackedLink>
          </Button>
        ) : null}
      </div>
      <h2 className="mt-3 truncate text-lg font-semibold tracking-[-0.04em] text-foreground">
        <TrackedLink href={`/jobs/${job.id}`} className="hover:underline">
          {job.title}
        </TrackedLink>
      </h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {[job.department, job.location, job.employmentType]
          .filter(Boolean)
          .join(" / ") || "No role metadata yet"}
      </p>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-foreground/86">
        {job.intakeSummary ??
          "No intake summary yet. RF-031/RF-034 will deepen this role record from here."}
      </p>
    </div>

    <div className="rounded-[1.2rem] border border-border/65 bg-background/46 px-3 py-3">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Client
      </p>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-surface-1">
          <Building2 className="size-4 text-muted-foreground" />
        </span>
        <p className="min-w-0 truncate text-sm font-medium text-foreground">
          {job.client?.name ?? "Missing client"}
        </p>
      </div>
    </div>

    <div className="rounded-[1.2rem] border border-border/65 bg-background/46 px-3 py-3">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Owner
      </p>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-surface-1">
          <UserRound className="size-4 text-muted-foreground" />
        </span>
        <p className="min-w-0 truncate text-sm font-medium text-foreground">
          {job.owner?.name ?? job.owner?.email ?? "Unassigned"}
        </p>
      </div>
    </div>

    <div className="rounded-[1.2rem] border border-border/65 bg-background/46 px-3 py-3">
      <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Target
      </p>
      <p className="mt-3 text-sm font-medium text-foreground">
        {formatJobDate(job.targetFillDate)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatJobSalary(job)}
      </p>
    </div>
  </article>
);

const JobsEmptyState = ({
  hasFilters,
  onReset,
}: {
  hasFilters: boolean;
  onReset: () => void;
}) => (
  <div className="rounded-[1.55rem] border border-dashed border-border/75 bg-background/38 px-6 py-14 text-center">
    <span className="mx-auto flex size-14 items-center justify-center rounded-[1.35rem] border border-border/70 bg-surface-1">
      <BriefcaseBusiness className="size-5 text-foreground" />
    </span>
    <h2 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-foreground">
      {hasFilters ? "No matching jobs" : "No jobs yet"}
    </h2>
    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
      {hasFilters
        ? "Try loosening the search or filters. The API is still preserving workspace scope while returning an empty filtered result."
        : "Create the first job intake record once a client exists, then the pipeline branch can attach submissions to a stable role container."}
    </p>
    {hasFilters ? (
      <Button
        className="mt-6 rounded-full"
        type="button"
        variant="outline"
        onClick={onReset}
      >
        <RotateCcw className="size-4" />
        Reset filters
      </Button>
    ) : null}
  </div>
);

const JobsListSurface = ({
  initialData,
  initialFilters,
}: JobsListSurfaceProps) => {
  const {
    activeJobsCount,
    applyFilters,
    canManageJobs,
    clientOptions,
    currentPage,
    error,
    filterCount,
    filters,
    hasFilters,
    isError,
    isFetching,
    jobsList,
    ownerOptions,
    refetch,
    resetFilters,
    searchDraft,
    setSearchDraft,
    totalPages,
    urgentJobsCount,
  } = useJobsListSurface({
    initialData,
    initialFilters,
  });

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="Role intake"
        title="Jobs"
        description="Browse workspace-scoped role demand by client, owner, status, and priority, then capture new requisitions through the RF-031 create/edit flow."
        rightSlotClassName="w-full xl:w-auto"
        rightSlot={
          <div className="flex w-full flex-col gap-3 xl:w-auto xl:items-end">
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              {canManageJobs ? (
                <Button asChild size="sm" className="rounded-full">
                  <TrackedLink href="/jobs/new">
                    <Plus className="size-4" />
                    Create job
                  </TrackedLink>
                </Button>
              ) : null}
              {isFetching ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-workspace-muted-surface px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Syncing
                </span>
              ) : null}
              {!canManageJobs ? (
                <span className="status-message border-border/70 bg-surface-1/70 text-muted-foreground">
                  Coordinator read-only view
                </span>
              ) : null}
            </div>

            <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
              <JobsHeaderMetric
                label="Visible"
                value={String(jobsList.pagination.totalItems)}
              />
              <JobsHeaderMetric
                label="Active"
                value={String(activeJobsCount)}
              />
              <JobsHeaderMetric
                label="Urgent"
                value={String(urgentJobsCount)}
              />
            </div>
          </div>
        }
      />

      <WorkspaceListSurfaceShell
        filterBadges={
          <>
            <WorkspaceListStatusBadge>
              {filterCount ? `${filterCount} active filters` : "No filters"}
            </WorkspaceListStatusBadge>
            <WorkspaceListStatusBadge>
              {jobsList.workspaceScoped ? "Workspace scoped" : "Scope pending"}
            </WorkspaceListStatusBadge>
          </>
        }
        filterControlsClassName="lg:grid-cols-[minmax(0,1.16fr)_repeat(5,minmax(0,0.72fr))_auto]"
        filterControls={
          <>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Search
              </span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Role, client, department, or location"
                  value={searchDraft}
                  onChange={(event) => {
                    setSearchDraft(event.target.value);
                  }}
                />
              </span>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Client
              </span>
              <FilterSelect
                value={filters.clientId}
                options={clientOptions}
                placeholder="All clients"
                onValueChange={(clientId) => {
                  applyFilters({ clientId, page: "" });
                }}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Status
              </span>
              <FilterSelect
                value={filters.status}
                options={[
                  { label: "All statuses", value: "" },
                  ...jobStatusOptions,
                ]}
                placeholder="All statuses"
                onValueChange={(status) => {
                  applyFilters({
                    page: "",
                    status: status as JobListFilters["status"],
                  });
                }}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Owner
              </span>
              <FilterSelect
                value={filters.owner}
                options={ownerOptions}
                placeholder="All owners"
                onValueChange={(owner) => {
                  applyFilters({ owner, page: "" });
                }}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Priority
              </span>
              <FilterSelect
                value={filters.priority}
                options={[
                  { label: "All priorities", value: "" },
                  ...jobPriorityOptions,
                ]}
                placeholder="All priorities"
                onValueChange={(priority) => {
                  applyFilters({
                    page: "",
                    priority: priority as JobListFilters["priority"],
                  });
                }}
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Sort
              </span>
              <FilterSelect
                value={filters.sort}
                options={jobSortOptions}
                placeholder="Recently opened"
                onValueChange={(sort) => {
                  applyFilters({
                    page: "",
                    sort: sort as JobListFilters["sort"],
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
          isError ? (
            <div className="rounded-[1.35rem] border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-sm font-medium text-foreground">
                Unable to refresh jobs.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {error instanceof Error
                  ? error.message
                  : "The jobs API returned an unexpected error."}
              </p>
              <Button
                className="mt-4 rounded-full"
                type="button"
                variant="outline"
                onClick={() => {
                  void refetch();
                }}
              >
                <RotateCcw className="size-4" />
                Retry
              </Button>
            </div>
          ) : null
        }
        contentHeader={
          <>
            <span>Role</span>
            <span>Client</span>
            <span>Owner</span>
            <span>Target</span>
          </>
        }
        contentHeaderClassName="lg:grid-cols-[minmax(0,1.35fr)_minmax(10rem,0.46fr)_minmax(10rem,0.42fr)_minmax(8rem,0.32fr)]"
        pagination={{
          currentPage,
          onNext: () => {
            applyFilters({ page: String(currentPage + 1) });
          },
          onPrevious: () => {
            applyFilters({
              page: currentPage - 1 > 1 ? String(currentPage - 1) : "",
            });
          },
          pageSize: jobsList.pagination.pageSize,
          totalItems: jobsList.pagination.totalItems,
          totalPages,
        }}
        footerNote={{
          icon: <Filter className="size-4 text-muted-foreground" />,
          title: "Jobs intake boundary",
          children:
            "This page owns the workspace-scoped jobs list, filter surface, create/edit entry points, and API-backed default stage initialization. Full job detail remains downstream.",
        }}
      >
        {jobsList.items.length > 0 ? (
          jobsList.items.map((job) => (
            <JobRow key={job.id} canManageJobs={canManageJobs} job={job} />
          ))
        ) : (
          <JobsEmptyState hasFilters={hasFilters} onReset={resetFilters} />
        )}
      </WorkspaceListSurfaceShell>
    </section>
  );
};

export { JobsListSurface };
