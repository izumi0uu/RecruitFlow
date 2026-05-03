"use client";

import type {
  ApiRiskFlag,
  SubmissionRecord,
  SubmissionsListResponse,
} from "@recruitflow/contracts";
import { apiDefaultJobStageTemplate } from "@recruitflow/contracts";
import { Filter, Loader2, RotateCcw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Input } from "@/components/ui/Input";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { cn } from "@/lib/utils";

import type { PipelineActiveFilter } from "./PipelineSurface";

export type PipelineFilterValues = {
  candidateId: string;
  clientId: string;
  jobId: string;
  owner: string;
  q: string;
  risk: string;
  stage: string;
};

type PipelineFilterControlsProps = {
  activeFilters: PipelineActiveFilter[];
  filters: PipelineFilterValues;
  resetHref: string;
  submissions: SubmissionsListResponse;
};

type FilterOption = {
  label: string;
  value: string;
};

const riskLabelMap: Record<ApiRiskFlag, string> = {
  compensation_risk: "Compensation",
  feedback_risk: "Feedback",
  fit_risk: "Fit",
  none: "Clear",
  timing_risk: "Timing",
};

const getOptionFallbackLabel = (prefix: string, value: string) =>
  value.length > 8 ? `${prefix} ${value.slice(0, 8)}...` : `${prefix} ${value}`;

const addUniqueOption = (
  options: FilterOption[],
  seenValues: Set<string>,
  option: FilterOption | null,
) => {
  if (!option?.value || seenValues.has(option.value)) {
    return;
  }

  seenValues.add(option.value);
  options.push(option);
};

const buildJobOptions = (
  items: SubmissionRecord[],
  selectedJobId: string,
): FilterOption[] => {
  const options: FilterOption[] = [{ label: "All jobs", value: "" }];
  const seenValues = new Set<string>();

  for (const submission of items) {
    addUniqueOption(
      options,
      seenValues,
      submission.job
        ? {
            label: [submission.job.title, submission.job.client?.name ?? null]
              .filter(Boolean)
              .join(" - "),
            value: submission.job.id,
          }
        : null,
    );
  }

  if (selectedJobId && !seenValues.has(selectedJobId)) {
    options.push({
      label: getOptionFallbackLabel("Selected job", selectedJobId),
      value: selectedJobId,
    });
  }

  return options;
};

const buildClientOptions = (
  items: SubmissionRecord[],
  selectedClientId: string,
): FilterOption[] => {
  const options: FilterOption[] = [{ label: "All clients", value: "" }];
  const seenValues = new Set<string>();

  for (const submission of items) {
    addUniqueOption(
      options,
      seenValues,
      submission.job?.client
        ? {
            label: submission.job.client.name,
            value: submission.job.client.id,
          }
        : null,
    );
  }

  if (selectedClientId && !seenValues.has(selectedClientId)) {
    options.push({
      label: getOptionFallbackLabel("Selected client", selectedClientId),
      value: selectedClientId,
    });
  }

  return options;
};

const buildOwnerOptions = (
  submissions: SubmissionsListResponse,
): FilterOption[] => [
  { label: "All owners", value: "" },
  ...submissions.ownerOptions.map((owner) => ({
    label: owner.name ?? owner.email,
    value: owner.id,
  })),
];

const stageOptions: FilterOption[] = [
  { label: "All stages", value: "" },
  ...apiDefaultJobStageTemplate.map((stage) => ({
    label: stage.label,
    value: stage.key,
  })),
];

const riskOptions: FilterOption[] = [
  { label: "Any risk", value: "" },
  ...Object.entries(riskLabelMap).map(([value, label]) => ({
    label,
    value,
  })),
];

const PipelineFilterBadge = ({
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

export const PipelineFilterControls = ({
  activeFilters,
  filters,
  resetHref,
  submissions,
}: PipelineFilterControlsProps) => {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [searchDraft, setSearchDraft] = React.useState(filters.q);
  const normalizedSearchDraft = searchDraft.trim();
  const debouncedSearchDraft = useDebouncedValue(normalizedSearchDraft, 320);
  const jobOptions = React.useMemo(
    () => buildJobOptions(submissions.items, filters.jobId),
    [filters.jobId, submissions.items],
  );
  const clientOptions = React.useMemo(
    () => buildClientOptions(submissions.items, filters.clientId),
    [filters.clientId, submissions.items],
  );
  const ownerOptions = React.useMemo(
    () => buildOwnerOptions(submissions),
    [submissions],
  );
  const hasFilters = activeFilters.length > 0;

  React.useEffect(() => {
    setSearchDraft(filters.q);
  }, [filters.q]);

  const replacePipelineUrl = React.useCallback(
    (params: URLSearchParams) => {
      const queryString = params.toString();
      const href = `/pipeline${queryString ? `?${queryString}` : ""}`;

      startTransition(() => {
        router.replace(href, { scroll: false });
      });
    },
    [router],
  );

  const applyFilters = React.useCallback(
    (updates: Partial<PipelineFilterValues>) => {
      const params = new URLSearchParams(window.location.search);

      params.delete("submissionCreated");

      for (const [key, rawValue] of Object.entries(updates)) {
        const value = rawValue?.trim() ?? "";

        if (key === "risk") {
          params.delete("riskFlag");
        }

        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }

      replacePipelineUrl(params);
    },
    [replacePipelineUrl],
  );

  React.useEffect(() => {
    if (debouncedSearchDraft !== normalizedSearchDraft) {
      return;
    }

    if (debouncedSearchDraft === filters.q) {
      return;
    }

    applyFilters({ q: debouncedSearchDraft });
  }, [applyFilters, debouncedSearchDraft, filters.q, normalizedSearchDraft]);

  return (
    <div className="rounded-[1.65rem] border border-border/70 bg-background/45 p-3 shadow-[0_24px_70px_-54px_var(--shadow-color)]">
      <div className="rounded-[1.25rem] border border-border/70 bg-workspace-muted-surface/48 p-4">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[1rem] border border-border/70 bg-background/70">
              <Filter className="size-4 text-foreground" />
            </span>
            <div className="min-w-0">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Focus filters
              </p>
              <p className="mt-1 truncate text-sm text-foreground">
                {submissions.pagination.totalItems} visible opportunities
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PipelineFilterBadge className="border-border/70 bg-surface-1 text-muted-foreground">
              {hasFilters ? `${activeFilters.length} active` : "Full pipeline"}
            </PipelineFilterBadge>
            {isPending ? (
              <PipelineFilterBadge className="border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                <Loader2 className="mr-1 size-3.5 animate-spin" />
                Syncing
              </PipelineFilterBadge>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.18fr)_repeat(5,minmax(0,0.72fr))_auto] lg:items-end">
          <div className="space-y-2">
            <label
              className="block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
              htmlFor="pipeline-filter-search"
            >
              Search
            </label>
            <Input
              id="pipeline-filter-search"
              leadingIcon={<Search className="size-4" />}
              value={searchDraft}
              onChange={(event) => {
                setSearchDraft(event.target.value);
              }}
              placeholder="Candidate, role, client, next step"
            />
          </div>

          <div className="space-y-2">
            <label
              className="block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
              htmlFor="pipeline-filter-job"
            >
              Job
            </label>
            <FilterSelect
              id="pipeline-filter-job"
              value={filters.jobId}
              options={jobOptions}
              placeholder="All jobs"
              onValueChange={(jobId) => {
                applyFilters({ jobId });
              }}
            />
          </div>

          <div className="space-y-2">
            <label
              className="block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
              htmlFor="pipeline-filter-client"
            >
              Client
            </label>
            <FilterSelect
              id="pipeline-filter-client"
              value={filters.clientId}
              options={clientOptions}
              placeholder="All clients"
              onValueChange={(clientId) => {
                applyFilters({ clientId });
              }}
            />
          </div>

          <div className="space-y-2">
            <label
              className="block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
              htmlFor="pipeline-filter-owner"
            >
              Owner
            </label>
            <FilterSelect
              id="pipeline-filter-owner"
              value={filters.owner}
              options={ownerOptions}
              placeholder="All owners"
              onValueChange={(owner) => {
                applyFilters({ owner });
              }}
            />
          </div>

          <div className="space-y-2">
            <label
              className="block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
              htmlFor="pipeline-filter-stage"
            >
              Stage
            </label>
            <FilterSelect
              id="pipeline-filter-stage"
              value={filters.stage}
              options={stageOptions}
              placeholder="All stages"
              onValueChange={(stage) => {
                applyFilters({ stage });
              }}
            />
          </div>

          <div className="space-y-2">
            <label
              className="block text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
              htmlFor="pipeline-filter-risk"
            >
              Risk
            </label>
            <FilterSelect
              id="pipeline-filter-risk"
              value={filters.risk}
              options={riskOptions}
              placeholder="Any risk"
              onValueChange={(risk) => {
                applyFilters({ risk });
              }}
            />
          </div>

          <Button
            className="rounded-full"
            type="button"
            variant="outline"
            disabled={!hasFilters && !filters.candidateId}
            onClick={() => {
              setSearchDraft("");
              startTransition(() => {
                router.replace(resetHref, { scroll: false });
              });
            }}
          >
            <RotateCcw className="size-4" />
            Reset
          </Button>
        </div>

        {activeFilters.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {activeFilters.map((filter) => (
              <PipelineFilterBadge
                key={`${filter.label}-${filter.value}`}
                className="border-border/70 bg-surface-1 text-muted-foreground"
              >
                {filter.label}: {filter.value}
              </PipelineFilterBadge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};
