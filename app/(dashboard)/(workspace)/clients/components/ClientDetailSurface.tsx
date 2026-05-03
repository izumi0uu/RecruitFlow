"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  BriefcaseBusiness,
  Building2,
  Clock3,
  ContactRound,
  Loader2,
  Mail,
  Plus,
  RadioTower,
  RotateCcw,
} from "lucide-react";
import { TrackedLink } from "@/components/navigation/TrackedLink";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { isApiRequestError } from "@/lib/api/errors";
import { clientDetailQueryOptions } from "@/lib/query/options";
import { cn } from "@/lib/utils";
import { QuickTaskPanel } from "../../tasks/components/QuickTaskPanel";
import {
  clientDetailPriorityToneMap,
  clientStatusToneMap,
  formatClientDate,
  formatClientLabel,
} from "../utils";
import { ArchiveClientControl } from "./ArchiveClientControl";
import { ClientContactCreateAction } from "./ClientContactCreateAction";
import { ClientDetailEditAction } from "./ClientDetailEditAction";
import { RestoreClientControl } from "./RestoreClientControl";

type ClientDetailSurfaceProps = {
  clientId: string;
};

const ClientDetailLoadingState = () => (
  <section className="space-y-6 px-0 py-1 lg:py-2">
    <WorkspacePageHeader
      backHref="/clients"
      breadcrumbItems={[
        { label: "Clients", href: "/clients" },
        { label: "Loading client" },
      ]}
      kicker="Client overview"
      title="Loading client"
      description="The client detail is loading through the client query cache."
    />
    <Card className="max-w-4xl">
      <CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-full border border-border/70 bg-surface-1">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </span>
        <p className="text-sm font-medium text-foreground">
          Loading client detail
        </p>
      </CardContent>
    </Card>
  </section>
);

const ClientDetailErrorState = ({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) => {
  const isNotFound = isApiRequestError(error) && error.status === 404;

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        backHref="/clients"
        breadcrumbItems={[
          { label: "Clients", href: "/clients" },
          { label: isNotFound ? "Client not found" : "Unable to load client" },
        ]}
        kicker="Client overview"
        title={isNotFound ? "Client not found" : "Unable to load client"}
        description={
          isNotFound
            ? "This client may have been removed or may not belong to the current workspace."
            : "The client detail query returned an error."
        }
      />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>
            {isNotFound ? "Client not found" : "Unable to load client"}
          </CardTitle>
          <CardDescription>
            {isNotFound
              ? "This client may have been removed or may not belong to the current workspace."
              : "The client detail query returned an error."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isNotFound ? (
            <p className="status-message status-error">
              {error instanceof Error
                ? error.message
                : "The client detail request failed."}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            {!isNotFound ? (
              <Button
                className="rounded-full"
                type="button"
                variant="outline"
                onClick={onRetry}
              >
                <RotateCcw className="size-4" />
                Retry
              </Button>
            ) : null}
            <Button asChild className="rounded-full" variant="outline">
              <TrackedLink href="/clients">Go to clients</TrackedLink>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

const ClientDetailSurface = ({ clientId }: ClientDetailSurfaceProps) => {
  const {
    data: clientDetail,
    error,
    isError,
    isLoading,
    refetch,
  } = useQuery(clientDetailQueryOptions(clientId));

  if (isLoading) {
    return <ClientDetailLoadingState />;
  }

  if (isError || !clientDetail) {
    return (
      <ClientDetailErrorState
        error={error}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  const { client, contacts, context, ownerOptions } = clientDetail;
  const ownerLabel = client.owner?.name ?? client.owner?.email ?? "Unassigned";
  const primaryContact = contacts.find((contact) => contact.isPrimary);
  const isArchived = client.status === "archived" || Boolean(client.archivedAt);
  const canManageLifecycle = context.role !== "coordinator";
  const canArchive = !isArchived && canManageLifecycle;
  const canCreateJob = !isArchived && canManageLifecycle;

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        backHref="/clients"
        breadcrumbItems={[
          { label: "Clients", href: "/clients" },
          { label: client.name },
        ]}
        kicker="Client overview"
        title={client.name}
        description="The stable account handoff page for future contacts, jobs, activity, and task entry points."
        rightSlot={
          <ClientDetailEditAction
            canManageClientControls={context.role !== "coordinator"}
            client={client}
            ownerOptions={ownerOptions}
          />
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold",
                    isArchived
                      ? clientStatusToneMap.archived
                      : clientStatusToneMap[client.status],
                  )}
                >
                  {isArchived ? "Archived" : formatClientLabel(client.status)}
                </span>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    clientDetailPriorityToneMap[client.priority],
                  )}
                >
                  {formatClientLabel(client.priority)} priority
                </span>
              </div>
              <CardTitle className="text-2xl">Account baseline</CardTitle>
              <CardDescription>
                Core company context that downstream job intake and submission
                work can rely on.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.35rem] border border-border/70 bg-surface-1/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Industry
                </p>
                <p className="mt-3 text-sm font-medium text-foreground">
                  {client.industry ?? "No industry captured yet"}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-border/70 bg-surface-1/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  HQ location
                </p>
                <p className="mt-3 text-sm font-medium text-foreground">
                  {client.hqLocation ?? "No location captured yet"}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-border/70 bg-surface-1/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Website
                </p>
                {client.website ? (
                  <a
                    className="mt-3 block text-sm font-medium text-foreground underline-offset-4 hover:underline"
                    href={client.website}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {client.website}
                  </a>
                ) : (
                  <p className="mt-3 text-sm font-medium text-foreground">
                    No website captured yet
                  </p>
                )}
              </div>
              <div className="rounded-[1.35rem] border border-border/70 bg-surface-1/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Owner
                </p>
                <p className="mt-3 text-sm font-medium text-foreground">
                  {ownerLabel}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Relationship notes</CardTitle>
              <CardDescription>
                A lightweight account readout before the notes/activity branch
                adds richer collaboration records.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="rounded-[1.35rem] border border-border/70 bg-surface-1/70 p-4 text-sm leading-6 text-foreground">
                {client.notesPreview ??
                  "No notes preview yet. Use the edit form to capture what the next recruiter should know about this account."}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ContactRound className="size-4" />
                      Contacts
                    </CardTitle>
                    <CardDescription>
                      Hiring managers and relationship entry points.
                    </CardDescription>
                  </div>
                  <ClientContactCreateAction
                    clientId={client.id}
                    clientName={client.name}
                    defaultIsPrimary={contacts.length === 0}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {contacts.length > 0 ? (
                  <div className="space-y-3">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="rounded-[1.35rem] border border-border/70 bg-surface-1/70 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">
                                {contact.fullName}
                              </p>
                              {contact.isPrimary ? (
                                <span className="rounded-full bg-foreground px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-background">
                                  Primary
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {[contact.title, contact.relationshipType]
                                .filter(Boolean)
                                .join(" · ") || "No title or relationship type"}
                            </p>
                          </div>
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className="rounded-full"
                          >
                            <TrackedLink
                              href={`/clients/${client.id}/contacts/${contact.id}/edit`}
                            >
                              Edit
                            </TrackedLink>
                          </Button>
                        </div>
                        {contact.email ? (
                          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="size-3.5" />
                            {contact.email}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.35rem] border border-dashed border-border bg-surface-1/60 p-5">
                    <p className="text-sm font-medium text-foreground">
                      No contacts yet.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Add the first hiring manager or HR partner so relationship
                      context is not trapped in email.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BriefcaseBusiness className="size-4" />
                      Open jobs slot
                    </CardTitle>
                    <CardDescription>
                      Lightweight handoff point for the jobs-intake branch.
                    </CardDescription>
                  </div>
                  {canCreateJob ? (
                    <Button asChild size="sm" className="rounded-full">
                      <TrackedLink href={`/jobs/new?clientId=${client.id}`}>
                        <Plus className="size-3.5" />
                        Create job
                      </TrackedLink>
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-[1.35rem] border border-border/70 bg-surface-1/70 p-5">
                  <p className="text-3xl font-semibold tracking-[-0.06em] text-foreground">
                    {client.openJobsCount}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {client.openJobsCount === 0
                      ? "No active jobs linked yet; create the first role from this account context."
                      : "active jobs currently linked"}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                    >
                      <TrackedLink href={`/jobs?clientId=${client.id}`}>
                        View jobs
                      </TrackedLink>
                    </Button>
                    {!canCreateJob ? (
                      <span className="status-message border-border/70 bg-background text-muted-foreground">
                        {client.status === "archived"
                          ? "Archived client"
                          : "Coordinator read-only"}
                      </span>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-4" />
                Account control
              </CardTitle>
              <CardDescription>
                The operational facts this page can safely own today.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1.25rem] border border-border/70 bg-surface-1/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Primary contact
                </p>
                <p className="mt-3 text-sm font-medium text-foreground">
                  {primaryContact?.fullName ?? "Not set"}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-surface-1/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Last contacted
                </p>
                <p className="mt-3 text-sm font-medium text-foreground">
                  {formatClientDate(client.lastContactedAt)}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-border/70 bg-surface-1/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Last updated
                </p>
                <p className="mt-3 text-sm font-medium text-foreground">
                  {formatClientDate(client.updatedAt)}
                </p>
              </div>
            </CardContent>
          </Card>

          <QuickTaskPanel
            canCreateTask={!isArchived}
            defaultAssignedToUserId={client.ownerUserId}
            entity={{
              entityId: client.id,
              entityType: "client",
              label: client.name,
              secondaryLabel: client.industry,
              trail: ["Client", client.name],
            }}
            ownerOptions={ownerOptions}
            title="Client tasks"
          />

          {isArchived || canArchive ? (
            <Card
              className={cn(
                isArchived ? "border-border/70" : "border-destructive/30",
              )}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="size-4" />
                  Client lifecycle
                </CardTitle>
                <CardDescription>
                  {isArchived
                    ? "This client is hidden from the default list, but its relationship history is still preserved."
                    : "Hide this client from the default list without deleting its history."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isArchived ? (
                  <>
                    <div className="rounded-[1.25rem] border border-border/70 bg-surface-1/70 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Archived
                      </p>
                      <p className="mt-3 text-sm font-medium text-foreground">
                        {client.archivedAt
                          ? `Archived on ${formatClientDate(client.archivedAt)}`
                          : "Archived date not recorded"}
                      </p>
                    </div>
                    {canManageLifecycle ? (
                      <RestoreClientControl clientId={client.id} />
                    ) : (
                      <p className="text-sm leading-6 text-muted-foreground">
                        Only owners and recruiters can restore archived clients.
                      </p>
                    )}
                  </>
                ) : (
                  <ArchiveClientControl clientId={client.id} />
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RadioTower className="size-4" />
                Recent activity
              </CardTitle>
              <CardDescription>
                Placeholder for the activity aggregation surface.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-[1.35rem] border border-dashed border-border bg-surface-1/60 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full border border-border/70 bg-background">
                    <Clock3 className="size-4 text-muted-foreground" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Latest account update:{" "}
                      {formatClientDate(client.updatedAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      CRM create, update, archive, and contact events are
                      audited by the API; the full timeline lands downstream.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
};

export { ClientDetailSurface };
