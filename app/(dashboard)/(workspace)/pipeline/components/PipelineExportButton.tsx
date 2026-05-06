"use client";

import type {
  ApiPipelineExportSourceSurface,
  ApiPipelineView,
} from "@recruitflow/contracts";
import { FileDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  readDownloadFailure,
  triggerBrowserDownload,
} from "@/components/documents/download-utils";
import { Button } from "@/components/ui/Button";

import type { PipelineFilterValues } from "./PipelineFilterControls";

type PipelineExportButtonProps = {
  filters: PipelineFilterValues;
  totalItems: number;
  view: ApiPipelineView;
};

const getSourceSurface = (
  view: ApiPipelineView,
): ApiPipelineExportSourceSurface =>
  view === "list" ? "pipeline_list" : "pipeline_board";

const getPipelineExportSearchParams = ({
  filters,
  view,
}: {
  filters: PipelineFilterValues;
  view: ApiPipelineView;
}) => {
  const params = new URLSearchParams({
    sourceSurface: getSourceSurface(view),
    view,
  });

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.jobId) {
    params.set("jobId", filters.jobId);
  }

  if (filters.candidateId) {
    params.set("candidateId", filters.candidateId);
  }

  if (filters.clientId) {
    params.set("clientId", filters.clientId);
  }

  if (filters.owner) {
    params.set("owner", filters.owner);
  }

  if (filters.stage) {
    params.set("stage", filters.stage);
  }

  if (filters.risk) {
    params.set("risk", filters.risk);
  }

  return params;
};

const getExportErrorMessage = ({
  code,
  message,
  status,
}: {
  code: string | null;
  message: string;
  status: number;
}) => {
  if (code === "RESULT_SET_EMPTY") {
    return "No pipeline opportunities match the current filters yet.";
  }

  if (status === 403) {
    return "Your role cannot export this pipeline view.";
  }

  return message || "Unable to export the pipeline right now.";
};

export const PipelineExportButton = ({
  filters,
  totalItems,
  view,
}: PipelineExportButtonProps) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const isEmpty = totalItems <= 0;

  const handleClick = async () => {
    if (isPending || isEmpty) {
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      const params = getPipelineExportSearchParams({ filters, view });
      const response = await fetch(
        `/api/submissions/export?${params.toString()}`,
        {
          method: "GET",
        },
      );

      if (response.status === 401) {
        router.push("/sign-in");
        return;
      }

      if (!response.ok) {
        setError(getExportErrorMessage(await readDownloadFailure(response)));
        return;
      }

      await triggerBrowserDownload(response, "pipeline-export.csv");
    } catch {
      setError("Unable to export the pipeline right now.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Button
        className="w-full justify-center rounded-full"
        type="button"
        variant="outline"
        disabled={isEmpty || isPending}
        onClick={() => {
          void handleClick();
        }}
      >
        {isPending ? (
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

      {error ? (
        <p className="status-message status-error">{error}</p>
      ) : (
        <p className="text-xs leading-5 text-muted-foreground">
          {isEmpty
            ? "Export appears when this view has matching opportunities."
            : "Exports filtered metadata only; files and packets stay out of scope."}
        </p>
      )}
    </div>
  );
};
