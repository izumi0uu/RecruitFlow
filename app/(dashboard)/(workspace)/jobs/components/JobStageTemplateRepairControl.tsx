"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";

import { useJobStageRepairMutation } from "./hooks/useJobMutations";

type JobStageTemplateRepairControlProps = {
  jobId: string;
};

export const JobStageTemplateRepairControl = ({
  jobId,
}: JobStageTemplateRepairControlProps) => {
  const { error, isPending, repairStageTemplate } =
    useJobStageRepairMutation({ jobId });

  return (
    <div className="mt-4 space-y-3">
      {error ? <p className="status-message status-error">{error}</p> : null}
      <Button
        type="button"
        size="sm"
        className="rounded-full"
        disabled={isPending}
        onClick={() => {
          repairStageTemplate();
        }}
      >
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Repairing...
          </>
        ) : (
          "Repair default stages"
        )}
      </Button>
    </div>
  );
};
