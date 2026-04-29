import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Filter,
  Plus,
  Search,
} from "lucide-react";
import { redirect } from "next/navigation";

import type {
  ApiClientPriority,
  ApiClientStatus,
  ClientsListResponse,
} from "@recruitflow/contracts";

import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TrackedLink } from "@/components/navigation/TrackedLink";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { isApiRequestError, requestApiJson } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
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

const statusToneMap: Record<ApiClientStatus, string> = {
  active: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  archived: "border-border/70 bg-surface-1 text-muted-foreground",
  paused: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  prospect: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};

const priorityToneMap: Record<ApiClientPriority, string> = {
  high: "bg-foreground text-background",
  low: "bg-surface-1 text-muted-foreground",
  medium: "bg-muted text-foreground",
};

const getSingleValue = (
  value: string | string[] | undefined,
) => {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
};

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

const buildClientsApiPath = (
  params: Record<string, string | string[] | undefined>,
) => {
  const query = new URLSearchParams();
  const q = getSingleValue(params.q);
  const status = getSingleValue(params.status);
  const owner = getSingleValue(params.owner);
  const priority = getSingleValue(params.priority);
  const page = getSingleValue(params.page);

  if (q) query.set("q", q);
  if (status) query.set("status", status);
  if (owner) query.set("owner", owner);
  if (priority) query.set("priority", priority);
  if (page) query.set("page", page);

  query.set("pageSize", "20");

  return `/clients?${query.toString()}`;
};

const getClientsList = async (
  params: Record<string, string | string[] | undefined>,
) => {
  try {
    return await requestApiJson<ClientsListResponse>(
      buildClientsApiPath(params),
    );
  } catch (error) {
    if (isApiRequestError(error) && error.status === 401) {
      redirect("/sign-in");
    }

    throw error;
  }
};

const ClientsPage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});
  const clientsList = await getClientsList(params);
  const hasFilters = Boolean(
    clientsList.filters.q ||
      clientsList.filters.status ||
      clientsList.filters.owner ||
      clientsList.filters.priority,
  );

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="Client relationships"
        title="Clients"
        description="Browse workspace-scoped client accounts, spot ownership, and keep the CRM entry point ready for create/edit flows."
        rightSlot={
          <Button disabled className="rounded-full opacity-70">
            <Plus className="size-4" />
            Create Client in RF-021
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total visible clients</CardDescription>
            <CardTitle className="text-3xl">
              {clientsList.pagination.totalItems}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Workspace scope</CardDescription>
            <CardTitle className="text-base">
              {toTitleCase(clientsList.context.role)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Page window</CardDescription>
            <CardTitle className="text-base">
              {clientsList.pagination.page} of {clientsList.pagination.totalPages}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="size-4" />
            Find the right account
          </CardTitle>
          <CardDescription>
            Filters are URL-backed so QA can reproduce the exact list state.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.8fr))_auto]">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Search
              </span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  name="q"
                  placeholder="Client, industry, or location"
                  defaultValue={clientsList.filters.q ?? ""}
                />
              </span>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Status
              </span>
              <select
                className="input"
                name="status"
                defaultValue={clientsList.filters.status ?? ""}
              >
                <option value="">All statuses</option>
                {clientStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Owner
              </span>
              <select
                className="input"
                name="owner"
                defaultValue={clientsList.filters.owner ?? ""}
              >
                <option value="">All owners</option>
                {clientsList.ownerOptions.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name ?? owner.email}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Priority
              </span>
              <select
                className="input"
                name="priority"
                defaultValue={clientsList.filters.priority ?? ""}
              >
                <option value="">All priorities</option>
                {clientPriorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end gap-2">
              <Button className="w-full rounded-full lg:w-auto" type="submit">
                Apply
              </Button>
              {hasFilters ? (
                <Button
                  asChild
                  className="rounded-full"
                  type="button"
                  variant="outline"
                >
                  <TrackedLink href="/clients">Reset</TrackedLink>
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      {clientsList.items.length > 0 ? (
        <div className="grid gap-4">
          {clientsList.items.map((client) => (
            <Card key={client.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.5fr)_minmax(220px,0.45fr)]">
                  <div className="space-y-4 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold",
                          statusToneMap[client.status],
                        )}
                      >
                        {toTitleCase(client.status)}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          priorityToneMap[client.priority],
                        )}
                      >
                        {toTitleCase(client.priority)} priority
                      </span>
                    </div>

                    <div>
                      <h2 className="text-xl font-semibold tracking-[-0.04em] text-foreground">
                        {client.name}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {[client.industry, client.hqLocation]
                          .filter(Boolean)
                          .join(" · ") || "No industry or location yet"}
                      </p>
                    </div>

                    <p className="max-w-2xl text-sm leading-6 text-foreground">
                      {client.notesPreview ??
                        "No client note preview yet. RF-021/RF-023 will deepen the client record from here."}
                    </p>
                  </div>

                  <div className="border-t border-border/70 p-5 lg:border-l lg:border-t-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Owner
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-full border border-border/70 bg-surface-1">
                        <Building2 className="size-4 text-foreground" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {client.owner?.name ?? client.owner?.email ?? "Unassigned"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last touch {formatDate(client.lastContactedAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/70 p-5 lg:border-l lg:border-t-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Jobs slot
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-[1.25rem] border border-border/70 bg-surface-1/70 p-4">
                      <div>
                        <p className="text-2xl font-semibold tracking-[-0.05em] text-foreground">
                          {client.openJobsCount}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          active jobs
                        </p>
                      </div>
                      <BriefcaseBusiness className="size-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="px-6 py-14 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-[1.35rem] border border-border/70 bg-surface-1">
              <Building2 className="size-5 text-foreground" />
            </span>
            <h2 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-foreground">
              {hasFilters ? "No matching clients" : "No clients yet"}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              {hasFilters
                ? "Try loosening the search or filters. The API is still preserving workspace scope while returning an empty filtered result."
                : "Once RF-021 adds creation, new agency accounts will appear here with owners, priority, and next-step context."}
            </p>
            {hasFilters ? (
              <Button asChild className="mt-6 rounded-full" variant="outline">
                <TrackedLink href="/clients">
                  Reset filters
                  <ArrowRight className="size-4" />
                </TrackedLink>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}
    </section>
  );
};

export default ClientsPage;
