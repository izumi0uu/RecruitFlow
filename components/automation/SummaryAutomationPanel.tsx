"use client";

import type {
  ApiAutomationStatus,
  ApiAutomationType,
  ApiDocumentEntityType,
  ApiDocumentType,
  AutomationRunCreateRequest,
  AutomationRunMutationResponse,
  DocumentRecord,
} from "@recruitflow/contracts";
import { Loader2, RefreshCcw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type SummaryAutomationPanelProps = {
  documents: DocumentRecord[];
  entityId: string;
  entityType: Extract<ApiDocumentEntityType, "candidate" | "job">;
  fallback: string;
  intro: string;
  preferredDocumentType: Extract<ApiDocumentType, "jd" | "resume">;
  title: string;
  type: Extract<ApiAutomationType, "candidate_summary" | "jd_summary">;
};

const statusToneMap: Record<ApiAutomationStatus, string> = {
  failed: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  queued: "border-border/70 bg-surface-1 text-muted-foreground",
  running: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  succeeded:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const statusLabelMap: Record<ApiAutomationStatus, string> = {
  failed: "Failed",
  queued: "Queued",
  running: "Running",
  succeeded: "Ready",
};

const actionLabelMap: Record<SummaryAutomationPanelProps["type"], string> = {
  candidate_summary: "Generate candidate summary",
  jd_summary: "Generate JD summary",
};

const getSummarySourceDocument = (
  documents: DocumentRecord[],
  preferredDocumentType: SummaryAutomationPanelProps["preferredDocumentType"],
) =>
  documents.find(
    (document) =>
      document.type === preferredDocumentType && document.summaryText,
  ) ??
  documents.find((document) => document.summaryText) ??
  documents.find((document) => document.type === preferredDocumentType) ??
  documents[0] ??
  null;

const getRequestErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as { error?: string };

    if (body.error) {
      return body.error;
    }
  } catch {
    // Fall through to the status fallback.
  }

  return `Unable to queue summary request (${response.status}).`;
};

export const requestAutomationRetry = async (automationRunId: string) => {
  const response = await fetch(
    `/api/automation/runs/${automationRunId}/retry`,
    {
      method: "POST",
    },
  );

  if (response.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }

  if (!response.ok) {
    throw new Error(await getRequestErrorMessage(response));
  }

  return (await response.json()) as AutomationRunMutationResponse;
};

export const requestSummaryRun = async (
  payload: AutomationRunCreateRequest,
) => {
  const response = await fetch("/api/automation/runs", {
    body: JSON.stringify(payload),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });

  if (response.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }

  if (!response.ok) {
    throw new Error(await getRequestErrorMessage(response));
  }

  return (await response.json()) as AutomationRunMutationResponse;
};

export const SummaryAutomationPanel = ({
  documents,
  entityId,
  entityType,
  fallback,
  intro,
  preferredDocumentType,
  title,
  type,
}: SummaryAutomationPanelProps) => {
  const router = useRouter();
  const sourceDocument = getSummarySourceDocument(
    documents,
    preferredDocumentType,
  );
  const summaryText = sourceDocument?.summaryText ?? null;
  const initialStatus = sourceDocument?.summaryStatus ?? "queued";
  const [queuedStatus, setQueuedStatus] =
    React.useState<ApiAutomationStatus | null>(null);
  const [automationRunId, setAutomationRunId] = React.useState<string | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const visibleStatus = queuedStatus ?? initialStatus;
  const isRetry = visibleStatus === "failed";
  const hasGeneratedSummary = Boolean(summaryText);

  const handleRequest = () => {
    if (isPending) {
      return;
    }

    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      try {
        const response =
          isRetry && automationRunId
            ? await requestAutomationRetry(automationRunId)
            : await requestSummaryRun({
                documentId: sourceDocument?.id,
                entityId,
                entityType,
                type,
              });

        setQueuedStatus(response.automationRun.status);
        setAutomationRunId(response.automationRun.id);
        setSuccessMessage(response.message);
        router.refresh();
      } catch (requestError) {
        if (
          requestError instanceof Error &&
          requestError.message === "UNAUTHENTICATED"
        ) {
          router.push("/sign-in");
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to queue this AI summary request.",
        );
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4" />
              {title}
            </CardTitle>
            <CardDescription>{intro}</CardDescription>
          </div>
          <span
            className={cn(
              "inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold",
              statusToneMap[visibleStatus],
            )}
          >
            {statusLabelMap[visibleStatus]}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[1.35rem] border border-border/70 bg-surface-1/70 p-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            AI-generated, recruiter-reviewed
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
            {summaryText ?? fallback}
          </p>
        </div>

        <div className="rounded-[1.35rem] border border-border/70 bg-background/55 p-4 text-sm leading-6 text-muted-foreground">
          <p>
            Source:{" "}
            <span className="font-medium text-foreground">
              {sourceDocument
                ? `${sourceDocument.title} (${sourceDocument.sourceFilename})`
                : "No linked document yet"}
            </span>
          </p>
          <p>
            Generated content stays in document summary metadata and never
            overwrites the core {entityType} truth fields.
          </p>
        </div>

        {visibleStatus === "failed" ? (
          <p className="status-message status-error">
            The latest automation state is failed. Retry queues a new observable
            run and keeps the core {entityType} record unchanged.
          </p>
        ) : null}

        {error ? <p className="status-message status-error">{error}</p> : null}
        {successMessage ? (
          <p className="status-message status-success">{successMessage}</p>
        ) : null}

        <Button
          type="button"
          className="rounded-full"
          variant={hasGeneratedSummary ? "outline" : "default"}
          disabled={isPending}
          onClick={handleRequest}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Queueing...
            </>
          ) : isRetry ? (
            <>
              <RefreshCcw className="size-4" />
              Retry summary
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              {hasGeneratedSummary
                ? "Regenerate summary"
                : actionLabelMap[type]}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
