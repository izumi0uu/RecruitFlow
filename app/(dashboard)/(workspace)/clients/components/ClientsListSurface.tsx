"use client";

import * as React from "react";
import {
  BriefcaseBusiness,
  Building2,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";

import type { ClientsListItem } from "@recruitflow/contracts";

import { Button } from "@/components/ui/Button";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Input } from "@/components/ui/Input";
import { TrackedLink } from "@/components/navigation/TrackedLink";
import {
  WorkspaceListStatusBadge,
  WorkspaceListSurfaceShell,
} from "@/components/workspace/WorkspaceListSurfaceShell";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import type { ClientListFilters } from "@/lib/clients/filters";
import { cn } from "@/lib/utils";

import { ClientCreateDialog } from "./ClientCreateDialog";
import { ClientEditDialog } from "./ClientEditDialog";
import { useClientsListSurface } from "./hooks/useClientsListSurface";
import {
  archivedClientTagTone,
  clientListPriorityToneMap,
  clientPriorityOptions,
  clientSortOptions,
  clientStatusOptions,
  clientStatusToneMap,
  formatClientLabel,
  formatClientShortDate,
} from "../utils";

type ClientsListSurfaceProps = {
  initialFilters: ClientListFilters;
};

const clientStatusFilterOptions = [
  { label: "All statuses", value: "" },
  ...clientStatusOptions,
];

const clientPriorityFilterOptions = [
  { label: "All priorities", value: "" },
  ...clientPriorityOptions,
];

const getClientInitial = (client: ClientsListItem) => {
  return client.name.trim().charAt(0).toUpperCase() || "C";
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
  canCreateClient,
  isFetching,
  onCreateClient,
  openJobsCount,
  ownerCount,
  totalItems,
}: {
  canCreateClient: boolean;
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
      <Button
        className="rounded-full"
        disabled={!canCreateClient}
        type="button"
        onClick={onCreateClient}
      >
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
              <ClientBadge className={archivedClientTagTone}>
                Archived
              </ClientBadge>
            ) : (
              <ClientBadge className={clientStatusToneMap[client.status]}>
                {formatClientLabel(client.status)}
              </ClientBadge>
            )}
            <ClientBadge className={clientListPriorityToneMap[client.priority]}>
              {formatClientLabel(client.priority)} priority
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
            Last touch {formatClientShortDate(client.lastContactedAt)}
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
        <Button
          asChild
          size="sm"
          variant="outline"
          className="rounded-full px-4"
        >
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

const ClientsLoadingState = () => (
  <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 py-14 text-center">
    <span className="flex size-12 items-center justify-center rounded-full border border-border/70 bg-surface-1">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </span>
    <div>
      <p className="text-sm font-medium text-foreground">Loading clients</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        The list is loading through the client query cache.
      </p>
    </div>
  </div>
);

const ClientsListSurface = ({
  initialFilters,
}: ClientsListSurfaceProps) => {
  const {
    applyFilters,
    canRestoreClientControls,
    clientsList,
    currentPage,
    editingClient,
    error,
    filterCount,
    filters,
    handleClientCreated,
    handleClientUpdated,
    hasFilters,
    isCreateDialogOpen,
    isError,
    isFetching,
    isLoading,
    openJobsCount,
    ownerFilterOptions,
    refetch,
    resetFilters,
    restoreClientMutation,
    searchDraft,
    setEditingClient,
    setIsCreateDialogOpen,
    setSearchDraft,
    totalPages,
  } = useClientsListSurface({
    initialFilters,
  });
  const hasClientsList = Boolean(clientsList);

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="Client relationships"
        title="Clients"
        description="Browse workspace-scoped client accounts, spot ownership, and keep the CRM entry point ready for create/edit flows."
        rightSlotClassName="w-full xl:w-auto"
        rightSlot={
          <ClientsHeaderSummary
            canCreateClient={hasClientsList}
            isFetching={isFetching || isLoading}
            onCreateClient={() => {
              setIsCreateDialogOpen(true);
            }}
            openJobsCount={openJobsCount}
            ownerCount={clientsList?.ownerOptions.length ?? 0}
            totalItems={clientsList?.pagination.totalItems ?? 0}
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
              {clientsList?.workspaceScoped
                ? "Workspace scoped"
                : isLoading
                  ? "Loading scope"
                  : "Scope pending"}
            </WorkspaceListStatusBadge>
          </>
        }
        filterControlsClassName="lg:grid-cols-[minmax(0,1.18fr)_repeat(4,minmax(0,0.72fr))_auto]"
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
                options={ownerFilterOptions}
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
          </>
        }
        alerts={
          <>
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

            {restoreClientMutation.error ? (
              <div className="rounded-[1.45rem] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {restoreClientMutation.error}
              </div>
            ) : null}
          </>
        }
        contentHeader={
          <>
            <span>Client</span>
            <span>Owner</span>
            <span>Jobs</span>
            <span className="text-right">Action</span>
          </>
        }
        contentHeaderClassName="lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.34fr)_minmax(8.5rem,0.18fr)_minmax(10rem,auto)]"
        pagination={{
          currentPage,
          disabled: !clientsList,
          onNext: () => {
            applyFilters({ page: String(currentPage + 1) });
          },
          onPrevious: () => {
            applyFilters({
              page: currentPage > 2 ? String(currentPage - 1) : "",
            });
          },
          pageSize: clientsList?.pagination.pageSize ?? 20,
          totalItems: clientsList?.pagination.totalItems ?? 0,
          totalPages,
        }}
        footerNote={{
          icon: <Sparkles className="size-4 text-muted-foreground" />,
          children:
            "This surface owns RF-020/RF-022 list browsing and filter reproducibility while handing off to the client creation, detail, edit, and contact flows through contract-backed routes.",
        }}
      >
        {!clientsList ? (
          <ClientsLoadingState />
        ) : clientsList.items.length > 0 ? (
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
                restoreClientMutation.restoreClient(selectedClientId);
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
      </WorkspaceListSurfaceShell>

      {clientsList ? (
        <>
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
        </>
      ) : null}
    </section>
  );
};

export { ClientsListSurface };
