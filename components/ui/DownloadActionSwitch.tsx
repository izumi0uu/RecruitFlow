"use client";

import { Check, Download, Square } from "lucide-react";
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type DownloadActionSwitchStatus = "idle" | "running" | "complete";

// Presentation only: callers must still use API-owned download/export endpoints
// so workspace scoping, permission checks, and audit writes stay enforceable.
type DownloadActionSwitchProps = Omit<
  ComponentPropsWithoutRef<"button">,
  "children" | "onClick"
> & {
  completeLabel?: string;
  defaultStatus?: DownloadActionSwitchStatus;
  idleLabel?: string;
  onDownload?: () => Promise<void> | void;
  onError?: (error: unknown) => void;
  onOpen?: () => Promise<void> | void;
  onStatusChange?: (status: DownloadActionSwitchStatus) => void;
  runningLabel?: string;
  status?: DownloadActionSwitchStatus;
};

const minimumRunningMs = 3600;

const getStatusLabel = (
  status: DownloadActionSwitchStatus,
  labels: {
    complete: string;
    idle: string;
    running: string;
  },
) => {
  if (status === "complete") {
    return labels.complete;
  }

  if (status === "running") {
    return labels.running;
  }

  return labels.idle;
};

const DownloadActionSwitch = forwardRef<
  HTMLButtonElement,
  DownloadActionSwitchProps
>(
  (
    {
      className,
      completeLabel = "Open",
      defaultStatus = "idle",
      disabled,
      idleLabel = "Download",
      onDownload,
      onError,
      onOpen,
      onStatusChange,
      runningLabel = "Preparing",
      status,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [internalStatus, setInternalStatus] =
      useState<DownloadActionSwitchStatus>(defaultStatus);
    const currentStatus = status ?? internalStatus;
    const isControlled = status !== undefined;
    const isRunning = currentStatus === "running";
    const isComplete = currentStatus === "complete";
    const isDisabled = disabled || isRunning;
    const currentLabel = getStatusLabel(currentStatus, {
      complete: completeLabel,
      idle: idleLabel,
      running: runningLabel,
    });

    useEffect(() => {
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }, []);

    const setNextStatus = (nextStatus: DownloadActionSwitchStatus) => {
      if (!isControlled) {
        setInternalStatus(nextStatus);
      }

      onStatusChange?.(nextStatus);
    };

    const finishDownload = (startedAt: number) => {
      const elapsedMs = Date.now() - startedAt;
      const remainingMs = Math.max(0, minimumRunningMs - elapsedMs);

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setNextStatus("complete");
      }, remainingMs);
    };

    const handleDownload = async () => {
      if (isDisabled) {
        return;
      }

      if (isComplete && onOpen) {
        try {
          await onOpen();
        } catch (error) {
          onError?.(error);
        }

        return;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      const startedAt = Date.now();
      setNextStatus("running");

      try {
        await onDownload?.();
        finishDownload(startedAt);
      } catch (error) {
        setNextStatus("idle");
        onError?.(error);
      }
    };

    return (
      <Button
        {...props}
        aria-busy={isRunning}
        className={cn("download-action-switch", className)}
        data-slot="DownloadActionSwitch"
        data-state={currentStatus}
        disabled={isDisabled}
        variant="ghost"
        ref={ref}
        type={type}
        onClick={() => {
          void handleDownload();
        }}
      >
        <span className="sr-only" aria-live="polite">
          {currentLabel}
        </span>
        <span className="download-action-switch__orb" aria-hidden="true">
          <Download className="download-action-switch__download-icon" />
          <Square className="download-action-switch__stop-icon" />
          <Check className="download-action-switch__check-icon" />
        </span>
        <span
          className="download-action-switch__label download-action-switch__label--idle"
          aria-hidden="true"
        >
          {idleLabel}
        </span>
        <span
          className="download-action-switch__label download-action-switch__label--running"
          aria-hidden="true"
        >
          {runningLabel}
        </span>
        <span
          className="download-action-switch__label download-action-switch__label--complete"
          aria-hidden="true"
        >
          {completeLabel}
        </span>
      </Button>
    );
  },
);

DownloadActionSwitch.displayName = "DownloadActionSwitch";

export type { DownloadActionSwitchProps, DownloadActionSwitchStatus };
export { DownloadActionSwitch };
