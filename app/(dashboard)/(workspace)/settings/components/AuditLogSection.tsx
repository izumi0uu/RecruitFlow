"use client";

import type { SettingsAuditListQuery } from "@recruitflow/contracts";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import {
  Activity,
  FileDown,
  FilterX,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  readDownloadFailure,
  triggerBrowserDownload,
} from "@/components/documents/download-utils";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import {
  currentUserQueryOptions,
  currentWorkspaceQueryOptions,
  settingsAuditQueryOptions,
} from "@/lib/query/options";

const auditActionOptions = [
  { label: "All actions", value: "" },
  { label: "Workspace created", value: "WORKSPACE_CREATED" },
  { label: "Workspace updated", value: "WORKSPACE_UPDATED" },
  { label: "Member invited", value: "MEMBER_INVITED" },
  { label: "Member joined", value: "MEMBER_JOINED" },
  { label: "Member role changed", value: "MEMBER_ROLE_CHANGED" },
  { label: "Member removed", value: "MEMBER_REMOVED" },
  { label: "Billing checkout started", value: "BILLING_CHECKOUT_STARTED" },
  { label: "Billing portal opened", value: "BILLING_PORTAL_OPENED" },
  { label: "Subscription synced", value: "BILLING_SUBSCRIPTION_SYNCED" },
];

const auditEntityOptions = [
  { label: "All entities", value: "" },
  { label: "Workspace", value: "workspace" },
  { label: "Membership", value: "membership" },
  { label: "Client", value: "client" },
  { label: "Client contact", value: "client_contact" },
  { label: "Job", value: "job" },
  { label: "Candidate", value: "candidate" },
  { label: "Submission", value: "submission" },
  { label: "Task", value: "task" },
  { label: "Document", value: "document" },
];

const formatAuditAction = (action: string) => {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const formatAuditDate = (createdAt: string) => {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt));
};

const getAuditExportErrorMessage = ({
  code,
  message,
  status,
}: {
  code: string | null;
  message: string;
  status: number;
}) => {
  if (code === "RESULT_SET_EMPTY") {
    return "No audit events match the current filters yet.";
  }

  if (status === 403) {
    return "Only workspace owners can export audit history.";
  }

  return message || "Unable to export audit history right now.";
};

const buildAuditExportSearchParams = (filters: SettingsAuditListQuery) => {
  const params = new URLSearchParams({ sourceSurface: "settings_audit" });

  if (filters.action) {
    params.set("action", filters.action);
  }

  if (filters.actorUserId) {
    params.set("actorUserId", filters.actorUserId);
  }

  if (filters.entityType) {
    params.set("entityType", filters.entityType);
  }

  if (filters.startDate) {
    params.set("startDate", filters.startDate);
  }

  if (filters.endDate) {
    params.set("endDate", filters.endDate);
  }

  return params;
};

const AuditLogSectionSkeleton = () => (
  <Card className="w-full">
    <CardHeader>
      <CardTitle>Workspace audit</CardTitle>
      <CardDescription>Loading workspace audit events.</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="animate-pulse space-y-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-24 rounded-[1.5rem] border border-border/70 bg-surface-1/70"
          />
        ))}
      </div>
    </CardContent>
  </Card>
);

const AuditLogSection = () => {
  const { data: user } = useSuspenseQuery(currentUserQueryOptions());
  const { data: workspace } = useSuspenseQuery(currentWorkspaceQueryOptions());
  const isOwner = user?.role === "owner";
  const [action, setAction] = useState("");
  const [actorUserId, setActorUserId] = useState("");
  const [entityType, setEntityType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const filters = useMemo<SettingsAuditListQuery>(
    () => ({
      ...(action ? { action } : {}),
      ...(actorUserId ? { actorUserId } : {}),
      ...(entityType ? { entityType } : {}),
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    }),
    [action, actorUserId, endDate, entityType, startDate],
  );
  const auditQuery = useQuery({
    ...settingsAuditQueryOptions(filters),
    enabled: isOwner,
  });
  const actorOptions = useMemo(() => {
    const members = workspace?.memberships ?? [];

    return [
      { label: "All actors", value: "" },
      ...members.map((member) => ({
        label: member.user.name || member.user.email,
        value: member.userId,
      })),
    ];
  }, [workspace?.memberships]);
  const hasActiveFilters = Boolean(
    action || actorUserId || entityType || startDate || endDate,
  );
  const isEmpty = (auditQuery.data?.items.length ?? 0) <= 0;

  const handleExport = async () => {
    if (isExporting || isEmpty) {
      return;
    }

    setExportError(null);
    setIsExporting(true);

    try {
      const params = buildAuditExportSearchParams(filters);
      const response = await fetch(
        `/api/settings/audit/export?${params.toString()}`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        setExportError(
          getAuditExportErrorMessage(await readDownloadFailure(response)),
        );
        return;
      }

      await triggerBrowserDownload(response, "audit-export.csv");
    } catch {
      setExportError("Unable to export audit history right now.");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOwner) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Workspace audit</CardTitle>
          <CardDescription>
            Audit history is limited to workspace owners.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-[1.5rem] border border-border/70 bg-surface-1/75 p-5 text-sm leading-6 text-muted-foreground">
            Your account activity remains visible above. Workspace-level audit
            history stays owner-only.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Workspace audit</CardTitle>
        <CardDescription>
          Browse curated workspace events without exposing raw audit metadata.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] lg:items-end">
          <FilterSelect
            options={auditActionOptions}
            placeholder="Action"
            value={action}
            onValueChange={setAction}
          />
          <FilterSelect
            options={actorOptions}
            placeholder="Actor"
            value={actorUserId}
            onValueChange={setActorUserId}
          />
          <FilterSelect
            options={auditEntityOptions}
            placeholder="Entity"
            value={entityType}
            onValueChange={setEntityType}
          />
          <div className="space-y-1.5">
            <Label htmlFor="audit-start-date" className="text-xs">
              Start date
            </Label>
            <Input
              id="audit-start-date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-end-date" className="text-xs">
              End date
            </Label>
            <Input
              id="audit-end-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={!hasActiveFilters || auditQuery.isFetching}
            onClick={() => {
              setAction("");
              setActorUserId("");
              setEntityType("");
              setStartDate("");
              setEndDate("");
              setExportError(null);
            }}
          >
            <FilterX className="size-4" />
            Clear
          </Button>
        </div>

        <div className="flex flex-col gap-2 rounded-[1.5rem] border border-border/70 bg-surface-1/55 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm leading-6 text-muted-foreground">
            Export the current owner-only filtered audit view as curated CSV.
            Raw metadata stays mapped into a safe summary column.
          </p>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={auditQuery.isLoading || isEmpty || isExporting}
            onClick={() => {
              void handleExport();
            }}
          >
            {isExporting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileDown className="size-4" />
                Export CSV
              </>
            )}
          </Button>
        </div>

        {exportError ? (
          <p className="status-message status-error">{exportError}</p>
        ) : null}

        {auditQuery.error ? (
          <p className="status-message status-error">
            {auditQuery.error instanceof Error
              ? auditQuery.error.message
              : "Unable to load audit events."}
          </p>
        ) : null}

        {auditQuery.isLoading ? (
          <div className="flex items-center gap-2 rounded-[1.5rem] border border-border/70 bg-surface-1/70 px-5 py-5 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading audit events...
          </div>
        ) : auditQuery.data?.items.length ? (
          <div className="max-h-[min(34rem,60dvh)] overflow-y-auto pr-1">
            <ul className="space-y-3">
              {auditQuery.data.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-4 rounded-[1.5rem] border border-border/70 bg-surface-1/70 px-4 py-4 md:flex-row md:items-start md:justify-between"
                >
                  <div className="flex min-w-0 gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-[1.15rem] border border-border/70 bg-background/75">
                      <ShieldCheck className="size-[1.125rem] text-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {formatAuditAction(item.action)}
                      </p>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {item.actor?.name ||
                          item.actor?.email ||
                          "System event"}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {item.entityType ? (
                          <span className="status-message border-border/70 bg-background text-muted-foreground">
                            {item.entityType}
                          </span>
                        ) : null}
                        {item.entityId ? (
                          <span className="font-mono text-[0.7rem]">
                            {item.entityId}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground md:text-right">
                    <p>{formatAuditDate(item.createdAt)}</p>
                    {item.ipAddress ? (
                      <p className="mt-2 font-mono text-xs">{item.ipAddress}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-border/70 bg-surface-1/55 px-6 py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-[1.35rem] border border-border/70 bg-background/70">
              <Activity className="size-5 text-foreground" />
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-[-0.03em] text-foreground">
              No audit events found
            </h3>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
              Workspace changes matching the current filters will appear here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { AuditLogSection, AuditLogSectionSkeleton };
