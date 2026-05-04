"use client";

import type {
  ApiDocumentDeliveryStatus,
  ApiDocumentDownloadSourceSurface,
} from "@recruitflow/contracts";
import { Download, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";

import { readDownloadFailure, triggerBrowserDownload } from "./download-utils";

type DocumentDownloadButtonProps = {
  className?: string;
  deliveryStatus: ApiDocumentDeliveryStatus;
  documentId: string;
  fileName: string;
  label?: string;
  sourceSurface: ApiDocumentDownloadSourceSurface;
  unavailableMessage?: string;
};

const defaultUnavailableMessage =
  "File unavailable until a storage object is attached to this metadata row.";

const getDownloadErrorMessage = ({
  code,
  message,
  status,
}: {
  code: string | null;
  message: string;
  status: number;
}) => {
  if (code === "DOCUMENT_FILE_MISSING") {
    return defaultUnavailableMessage;
  }

  if (code === "DOCUMENT_DELIVERY_EXPIRED") {
    return "This download link has expired. Refresh and try again.";
  }

  if (status === 403) {
    return "Your role cannot download this file from this surface.";
  }

  return message || "Unable to download this document right now.";
};

export const DocumentDownloadButton = ({
  className,
  deliveryStatus,
  documentId,
  fileName,
  label = "Download original",
  sourceSurface,
  unavailableMessage = defaultUnavailableMessage,
}: DocumentDownloadButtonProps) => {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const isUnavailable = deliveryStatus !== "available";

  const handleClick = async () => {
    if (isUnavailable || isPending) {
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      const response = await fetch(
        `/api/documents/${documentId}/download?sourceSurface=${sourceSurface}`,
        {
          method: "GET",
        },
      );

      if (response.status === 401) {
        router.push("/sign-in");
        return;
      }

      if (!response.ok) {
        setError(getDownloadErrorMessage(await readDownloadFailure(response)));
        return;
      }

      await triggerBrowserDownload(response, fileName);
    } catch {
      setError("Unable to download this document right now.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        className={className}
        type="button"
        variant="outline"
        size="sm"
        disabled={isUnavailable || isPending}
        onClick={() => {
          void handleClick();
        }}
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Downloading...
          </>
        ) : (
          <>
            <Download className="size-4" />
            {label}
          </>
        )}
      </Button>

      {error ? (
        <p className="status-message status-error">{error}</p>
      ) : isUnavailable ? (
        <p className="text-xs leading-5 text-muted-foreground">
          {unavailableMessage}
        </p>
      ) : null}
    </div>
  );
};
