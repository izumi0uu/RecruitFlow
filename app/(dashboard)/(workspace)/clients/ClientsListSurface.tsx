"use client";

import * as React from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Filter,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";

import type {
  ApiClientPriority,
  ApiClientSort,
  ApiClientStatus,
  ClientsListItem,
  ClientsListResponse,
  ClientRestoreResponse,
} from "@recruitflow/contracts";

import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Input } from "@/components/ui/Input";
import { TrackedLink } from "@/components/navigation/TrackedLink";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import {
  areClientListFiltersEqual,
  clientListFiltersToSearchParams,
  normalizeClientListFilters,
  parseClientListFiltersFromSearchParams,
  type ClientListFilters,
} from "@/lib/clients/filters";
import { clientsListQueryOptions } from "@/lib/query/options";
import { cn } from "@/lib/utils";

import { ClientCreateDialog } from "./ClientCreateDialog";
import { ClientEditDialog } from "./ClientEditDialog";

type ClientsListSurfaceProps = {
  initialData: ClientsListResponse;
  initialFilters: ClientListFilters;
};

const clientStatusOptions: Array<{
  label: string;
  value: ApiClientStatus;
}> = [
  { label: "Active", value: "active" },
  { label: "Prospect", value: "prospect" },
  { label: "Paused", value: "paused" },
  { label: "Archived", value: "archived" },
];

const clientPriorityOptions: Array<{
  label: string;
  value: ApiClientPriority;
}> = [
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const clientStatusFilterOptions = [
  { label: "All statuses", value: "" },
  ...clientStatusOptions,
];

const clientPriorityFilterOptions = [
  { label: "All priorities", value: "" },
  ...clientPriorityOptions,
];

const clientSortOptions: Array<{
  label: string;
  value: ApiClientSort;
}> = [
  { label: "Name A-Z", value: "name_asc" },
  { label: "Name Z-A", value: "name_desc" },
  { label: "Recently updated", value: "updated_desc" },
  { label: "Highest priority", value: "priority_desc" },
  { label: "Last touched", value: "last_contacted_desc" },
];

const statusToneMap: Record<ApiClientStatus, string> = {
  active:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  archived: "border-border/70 bg-surface-1 text-muted-foreground",
  paused:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  prospect: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

const priorityToneMap: Record<ApiClientPriority, string> = {
  high: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  low: "border-border/70 bg-surface-1 text-muted-foreground",
  medium:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

const archivedTagTone =
  "border-border/80 bg-background/72 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]";

const toTitleCase = (value: string) =>
  value
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");

const formatDate = (value: string | null) => {
  if (!value) {
    return "No touch yet";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
};

const getClientInitial = (client: ClientsListItem) => {
  return client.name.trim().charAt(0).toUpperCase() || "C";
};

const getFilterCount = (filters: ClientListFilters) =>
  [
    filters.q,
    filters.status,
    filters.owner,
    filters.priority,
    filters.sort !== "name_asc" ? filters.sort : "",
  ].filter(Boolean).length;

const buildUrlFromFilters = (filters: ClientListFilters) => {
  const queryString = clientListFiltersToSearchParams(filters).toString();

  return `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
};

const canUsePreviousClientListData = (
  previousFilters: unknown,
  nextFilters: ClientListFilters,
) => {
  const parsedPreviousFilters =
    previousFilters && typeof previousFilters === "object"
      ? normalizeClientListFilters(
          previousFilters as Partial<
            Record<keyof ClientListFilters, string | null | undefined>
          >,
        )
      : null;

  if (!parsedPreviousFilters) {
    return false;
  }

  return (
    parsedPreviousFilters.owner === nextFilters.owner &&
    parsedPreviousFilters.priority === nextFilters.priority &&
    parsedPreviousFilters.q === nextFilters.q &&
    parsedPreviousFilters.sort === nextFilters.sort &&
    parsedPreviousFilters.status === nextFilters.status
  );
};

const getClientRestoreErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as { error?: string };

    if (body.error) {
      return body.error;
    }
  } catch {
    // Use the fallback if the BFF does not return JSON.
  }

  return `Restore failed with status ${response.status}`;
};

const restoreClient = async (clientId: string) => {
  const response = await fetch(`/api/clients/${clientId}/restore`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(await getClientRestoreErrorMessage(response));
  }

  return (await response.json()) as ClientRestoreResponse;
};

const ClientsHeaderMetric = ({
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

const ClientsHeaderSummary = ({
  isFetching,
  onCreateClient,
  openJobsCount,
  ownerCount,
  totalItems,
}: {
  isFetching: boolean;
  onCreateClient: () => void;
  openJobsCount: number;
  ownerCount: number;
  totalItems: number;
}) => (
  <div className="flex w-full flex-col gap-3 xl:w-auto xl:items-end">
    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
      {isFetching ? (
        <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-workspace-muted-surface px-3 py-1 text-xs font-medium text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Syncing
        </span>
      ) : null}
      <Button className="rounded-full" type="button" onClick={onCreateClient}>
        <Plus className="size-4" />
        Create Client
      </Button>
    </div>

    <div className="grid w-full grid-cols-3 gap-2 sm:w-auto">
      <ClientsHeaderMetric label="Visible" value={String(totalItems)} />
      <ClientsHeaderMetric label="Open jobs" value={String(openJobsCount)} />
      <ClientsHeaderMetric label="Owners" value={String(ownerCount)} />
    </div>
  </div>
);

const ClientBadge = ({
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

const ClientRow = ({
  canRestoreClientControls,
  client,
  isRestorePending,
  onEditClient,
  onRestoreClient,
}: {
  canRestoreClientControls: boolean;
  client: ClientsListItem;
  isRestorePending: boolean;
  onEditClient: (client: ClientsListItem) => void;
  onRestoreClient: (clientId: string) => void;
}) => {
  const isArchived = client.status === "archived" || Boolean(client.archivedAt);

  return (
    <article className="group grid gap-4 border-t border-border/60 bg-background/18 px-4 py-4 transition-colors duration-200 first:border-t-0 hover:bg-workspace-muted-surface/38 md:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.34fr)_minmax(8.5rem,0.18fr)_minmax(10rem,auto)] lg:items-stretch">
      <div className="flex min-w-0 items-start gap-4 py-1">
        <div className="flex size-[3.25rem] shrink-0 items-center justify-center rounded-[1.25rem] border border-border/70 bg-background/78 text-sm font-semibold text-foreground shadow-[0_18px_46px_-34px_var(--shadow-color)]">
          {getClientInitial(client)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isArchived ? (
              <ClientBadge className={archivedTagTone}>Archived</ClientBadge>
            ) : (
              <ClientBadge className={statusToneMap[client.status]}>
                {toTitleCase(client.status)}
              </ClientBadge>
            )}
            <ClientBadge className={priorityToneMap[client.priority]}>
              {toTitleCase(client.priority)} priority
            </ClientBadge>
          </div>
          <h2 className="mt-3 truncate text-lg font-semibold tracking-[-0.04em] text-foreground">
            {client.name}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {[client.industry, client.hqLocation].filter(Boolean).join(" · ") ||
              "No industry or location yet"}
          </p>
          <p className="mt-4 line-clamp-2 max-w-3xl text-sm leading-6 text-foreground/86">
            {client.notesPreview ??
              "No client note preview yet. RF-021/RF-023 will deepen the client record from here."}
          </p>
        </div>
      </div>

      <div className="flex min-h-28 items-end justify-between gap-3 rounded-[1.35rem] border border-border/65 bg-background/52 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] lg:block">
        <div>
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Owner
          </p>
          <p className="mt-4 truncate text-lg font-semibold tracking-[-0.04em] text-foreground">
            {client.owner?.name ?? client.owner?.email ?? "Unassigned"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Last touch {formatDate(client.lastContactedAt)}
          </p>
        </div>
        <UserRound className="size-5 text-muted-foreground lg:mt-5" />
      </div>

      <div className="flex min-h-28 items-end justify-between gap-3 rounded-[1.35rem] border border-border/65 bg-background/52 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] lg:block">
        <div>
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Jobs
          </p>
          <p className="mt-4 text-3xl font-semibold tracking-[-0.07em] text-foreground">
            {client.openJobsCount}
          </p>
        </div>
        <BriefcaseBusiness className="size-5 text-muted-foreground lg:mt-6" />
      </div>

      <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:justify-self-end lg:self-center">
        <Button asChild size="sm" variant="outline" className="rounded-full px-4">
          <TrackedLink href={`/clients/${client.id}`}>Detail</TrackedLink>
        </Button>
        {isArchived ? (
          canRestoreClientControls ? (
            <Button
              size="sm"
              type="button"
              variant="outline"
              className="rounded-full px-4"
              disabled={isRestorePending}
              onClick={() => {
                onRestoreClient(client.id);
              }}
            >
              {isRestorePending ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  Restoring
                </>
              ) : (
                <>
                  Restore
                  <RotateCcw className="size-3" />
                </>
              )}
            </Button>
          ) : null
        ) : (
          <Button
            size="sm"
            type="button"
            variant="outline"
            className="rounded-full px-4"
            onClick={() => {
              onEditClient(client);
            }}
          >
            Edit
            <Pencil className="size-3" />
          </Button>
        )}
      </div>
    </article>
  );
};

const ClientsEmptyState = ({
  hasFilters,
  onCreateClient,
  onReset,
}: {
  hasFilters: boolean;
  onCreateClient: () => void;
  onReset: () => void;
}) => (
  <div className="rounded-[1.55rem] border border-dashed border-border/75 bg-background/38 px-6 py-14 text-center">
    <span className="mx-auto flex size-14 items-center justify-center rounded-[1.35rem] border border-border/70 bg-surface-1">
      <Building2 className="size-5 text-foreground" />
    </span>
    <h2 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-foreground">
      {hasFilters ? "No matching clients" : "No clients yet"}
    </h2>
    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
      {hasFilters
        ? "Try loosening the search or filters. The API is still preserving workspace scope while returning an empty filtered result."
        : "Create the first agency client account so future jobs, contacts, and submissions have a stable company record to attach to."}
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
    ) : (
      <Button
        className="mt-6 rounded-full"
        type="button"
        onClick={onCreateClient}
      >
        Create Client
      </Button>
    )}
  </div>
);

const ClientsListSurface = ({
  initialData,
  initialFilters,
}: ClientsListSurfaceProps) => {
  const queryClient = useQueryClient();
  const normalizedInitialFilters = React.useMemo(
    () => normalizeClientListFilters(initialFilters),
    [initialFilters],
  );
  const [filters, setFilters] = React.useState(normalizedInitialFilters);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [editingClient, setEditingClient] =
    React.useState<ClientsListItem | null>(null);
  const [searchDraft, setSearchDraft] = React.useState(
    normalizedInitialFilters.q,
  );
  const filtersRef = React.useRef(filters);

  React.useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  React.useEffect(() => {
    setSearchDraft(filters.q);
  }, [filters.q]);

  const writeUrl = React.useCallback((nextFilters: ClientListFilters) => {
    const nextUrl = buildUrlFromFilters(nextFilters);
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, []);

  const applyFilters = React.useCallback(
    (updates: Partial<ClientListFilters>) => {
      const nextFilters = normalizeClientListFilters({
        ...filtersRef.current,
        ...updates,
      });

      if (areClientListFiltersEqual(filtersRef.current, nextFilters)) {
        return;
      }

      filtersRef.current = nextFilters;
      setFilters(nextFilters);
      writeUrl(nextFilters);
    },
    [writeUrl],
  );

  React.useEffect(() => {
    const handlePopState = () => {
      const nextFilters = parseClientListFiltersFromSearchParams(
        new URLSearchParams(window.location.search),
      );

      filtersRef.current = nextFilters;
      setFilters(nextFilters);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  React.useEffect(() => {
    const nextSearchValue = searchDraft.trim();

    if (nextSearchValue === filters.q) {
      return;
    }

    const timeout = window.setTimeout(() => {
      applyFilters({ page: "", q: nextSearchValue });
    }, 320);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [applyFilters, filters.q, searchDraft]);

  const isInitialQuery = areClientListFiltersEqual(
    filters,
    normalizedInitialFilters,
  );
  const {
    data: clientsList = initialData,
    error,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    ...clientsListQueryOptions(filters),
    initialData: isInitialQuery ? initialData : undefined,
    placeholderData: (previousData, previousQuery) =>
      canUsePreviousClientListData(previousQuery?.queryKey[2], filters)
        ? previousData
        : undefined,
  });
  const [restoreErrorMessage, setRestoreErrorMessage] = React.useState<
    string | null
  >(null);
  const restoreClientMutation = useMutation({
    mutationFn: restoreClient,
    onMutate: () => {
      setRestoreErrorMessage(null);
    },
    onSuccess: async () => {
      await queryClient.cancelQueries({
        queryKey: ["clients", "list"],
      });
      queryClient.removeQueries({
        queryKey: ["clients", "list"],
        type: "inactive",
      });
      await queryClient.invalidateQueries({
        queryKey: ["clients", "list"],
        refetchType: "active",
      });
    },
    onError: (mutationError) => {
      setRestoreErrorMessage(
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to restore client.",
      );
    },
  });

  const filterCount = getFilterCount(filters);
  const hasFilters = filterCount > 0;
  const ownerOptions = [
    { label: "All owners", value: "" },
    ...clientsList.ownerOptions.map((owner) => ({
      label: owner.name ?? owner.email,
      value: owner.id,
    })),
  ];
  const openJobsCount = clientsList.items.reduce(
    (total, client) => total + client.openJobsCount,
    0,
  );
  const currentPage = clientsList.pagination.page;
  const totalPages = clientsList.pagination.totalPages;
  const canRestoreClientControls = clientsList.context.role !== "coordinator";

  const resetFilters = React.useCallback(() => {
    setSearchDraft("");
    applyFilters({
      owner: "",
      page: "",
      priority: "",
      q: "",
      sort: "name_asc",
      status: "",
    });
  }, [applyFilters]);

  const handleClientCreated = React.useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["clients", "list"],
    });
  }, [queryClient]);

  const handleClientUpdated = React.useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["clients", "list"],
    });
  }, [queryClient]);

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="Client relationships"
        title="Clients"
        description="Browse workspace-scoped client accounts, spot ownership, and keep the CRM entry point ready for create/edit flows."
        rightSlotClassName="w-full xl:w-auto"
        rightSlot={
          <ClientsHeaderSummary
            isFetching={isFetching}
            onCreateClient={() => {
              setIsCreateDialogOpen(true);
            }}
            openJobsCount={openJobsCount}
            ownerCount={clientsList.ownerOptions.length}
            totalItems={clientsList.pagination.totalItems}
          />
        }
      />

      <Card className="rounded-[2.15rem]">
        <CardContent className="space-y-5 pt-1">
          <div className="rounded-[1.65rem] border border-border/70 bg-workspace-muted-surface/48 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <div className="mb-3 flex flex-wrap items-center gap-2 px-1">
              <span className="status-message border-border/70 bg-surface-1/70 text-muted-foreground">
                {filterCount ? `${filterCount} active filters` : "No filters"}
              </span>
              <span className="status-message border-border/70 bg-surface-1/70 text-muted-foreground">
                {clientsList.workspaceScoped
                  ? "Workspace scoped"
                  : "Scope pending"}
              </span>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.18fr)_repeat(4,minmax(0,0.72fr))_auto] lg:items-end">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Search
                </span>
                <span className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Client, industry, or location"
                    value={searchDraft}
                    onChange={(event) => {
                      setSearchDraft(event.target.value);
                    }}
                  />
                </span>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Status
                </span>
                <FilterSelect
                  value={filters.status}
                  options={clientStatusFilterOptions}
                  placeholder="All statuses"
                  onValueChange={(status) => {
                    applyFilters({
                      page: "",
                      status: status as ClientListFilters["status"],
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
                  options={clientPriorityFilterOptions}
                  placeholder="All priorities"
                  onValueChange={(priority) => {
                    applyFilters({
                      page: "",
                      priority: priority as ClientListFilters["priority"],
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
                  options={clientSortOptions}
                  placeholder="Name A-Z"
                  onValueChange={(sort) => {
                    applyFilters({
                      page: "",
                      sort: sort as ClientListFilters["sort"],
                    });
                  }}
                />
              </label>

              <div className="flex items-center gap-2">
                <Button
                  className="rounded-full"
                  type="button"
                  variant="outline"
                  disabled={!hasFilters}
                  onClick={resetFilters}
                >
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {isError ? (
            <div className="rounded-[1.45rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  {error instanceof Error
                    ? error.message
                    : "Unable to refresh clients."}
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
          ) : null}

          {restoreErrorMessage ? (
            <div className="rounded-[1.45rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {restoreErrorMessage}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-[1.85rem] border border-border/70 bg-background/42 shadow-[0_24px_70px_-54px_var(--shadow-color)]">
            <div className="hidden grid-cols-[minmax(0,1fr)_minmax(15rem,0.34fr)_minmax(8.5rem,0.18fr)_minmax(10rem,auto)] gap-4 bg-workspace-muted-surface/62 px-5 py-3 text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground lg:grid">
              <span>Client</span>
              <span>Owner</span>
              <span>Jobs</span>
              <span className="text-right">Action</span>
            </div>

            {clientsList.items.length > 0 ? (
              clientsList.items.map((client) => (
                <ClientRow
                  canRestoreClientControls={canRestoreClientControls}
                  key={client.id}
                  client={client}
                  isRestorePending={
                    restoreClientMutation.isPending &&
                    restoreClientMutation.variables === client.id
                  }
                  onEditClient={(selectedClient) => {
                    setEditingClient(selectedClient);
                  }}
                  onRestoreClient={(selectedClientId) => {
                    restoreClientMutation.mutate(selectedClientId);
                  }}
                />
              ))
            ) : (
              <ClientsEmptyState
                hasFilters={hasFilters}
                onCreateClient={() => {
                  setIsCreateDialogOpen(true);
                }}
                onReset={resetFilters}
              />
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-[1.45rem] border border-border/70 bg-background/35 px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="size-4" />
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <span className="text-muted-foreground/60">·</span>
              <span>{clientsList.pagination.pageSize} per page</span>
              <span className="text-muted-foreground/60">·</span>
              <span>{clientsList.pagination.totalItems} total</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                className="rounded-full"
                type="button"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => {
                  applyFilters({
                    page: currentPage > 2 ? String(currentPage - 1) : "",
                  });
                }}
              >
                <ArrowLeft className="size-4" />
                Previous
              </Button>
              <Button
                className="rounded-full"
                type="button"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => {
                  applyFilters({ page: String(currentPage + 1) });
                }}
              >
                Next
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-[1.45rem] border border-border/70 bg-workspace-muted-surface/45 px-4 py-4">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[1rem] border border-border/70 bg-background/70">
              <Sparkles className="size-4 text-muted-foreground" />
            </span>
            <p className="text-sm leading-6 text-muted-foreground">
              This surface owns RF-020/RF-022 list browsing and filter
              reproducibility while handing off to the client creation, detail,
              edit, and contact flows through contract-backed routes.
            </p>
          </div>
        </CardContent>
      </Card>

      <ClientCreateDialog
        canManageClientControls={clientsList.context.role !== "coordinator"}
        onClientCreated={handleClientCreated}
        onOpenChange={setIsCreateDialogOpen}
        open={isCreateDialogOpen}
        ownerOptions={clientsList.ownerOptions}
      />

      <ClientEditDialog
        canManageClientControls={clientsList.context.role !== "coordinator"}
        client={editingClient}
        onClientUpdated={handleClientUpdated}
        onOpenChange={(open) => {
          if (!open) {
            setEditingClient(null);
          }
        }}
        open={editingClient !== null}
        ownerOptions={clientsList.ownerOptions}
      />
    </section>
  );
};

export { ClientsListSurface };
