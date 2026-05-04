"use client";

import type { ApiDocumentsExportSourceSurface } from "@recruitflow/contracts";
import { FileDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import {
  type DocumentListFilters,
  documentListFiltersToSearchParams,
} from "@/lib/documents/filters";

import { readDownloadFailure, triggerBrowserDownload } from "./download-utils";

type DocumentExportButtonProps = {
  className?: string;
  filters: DocumentListFilters;
  sourceSurface?: ApiDocumentsExportSourceSurface;
  totalItems: number;
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
    return "No documents match the current filters yet.";
  }

  if (status === 403) {
    return "Your role cannot export this document list.";
  }

  return message || "Unable to export documents right now.";
};

export const DocumentExportButton = ({
  className,
  filters,
  sourceSurface = "documents_hub",
  totalItems,
}: DocumentExportButtonProps) => {
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
      const params = documentListFiltersToSearchParams({
        ...filters,
        page: "",
      });

      params.set("sourceSurface", sourceSurface);

      const response = await fetch(
        `/api/documents/export?${params.toString()}`,
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

      await triggerBrowserDownload(response, "documents-export.csv");
    } catch {
      setError("Unable to export documents right now.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:ml-auto sm:items-end">
      <Button
        className={className}
        type="button"
        variant="outline"
        size="sm"
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
      ) : isEmpty ? (
        <p className="text-xs leading-5 text-muted-foreground">
          Export appears when at least one document matches the active filters.
        </p>
      ) : (
        <p className="text-xs leading-5 text-muted-foreground">
          Exports the current filtered metadata set without raw file contents.
        </p>
      )}
    </div>
  );
};
