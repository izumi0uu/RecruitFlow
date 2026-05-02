"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  jobMutationRequestSchema,
  type JobDetailResponse,
  type JobMutationResponse,
  type JobStageRepairResponse,
} from "@recruitflow/contracts";

import { fetchJson } from "@/lib/query/fetcher";
import {
  jobDetailQueryKey,
  jobsListRootQueryKey,
} from "@/lib/query/options";
import { isApiRequestError } from "@/lib/api/errors";

import type { JobFormValues } from "../../utils";

type JobMutationMode = "create" | "edit";

type UseJobMutationOptions = {
  jobId?: string;
  mode: JobMutationMode;
  onSuccess?: (response: JobMutationResponse) => Promise<void> | void;
};

type UseJobStageRepairMutationOptions = {
  jobId: string;
  onSuccess?: (response: JobStageRepairResponse) => Promise<void> | void;
};

const emptyToUndefined = (value: string) => {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

const getJobPayload = (values: JobFormValues) => ({
  clientId: values.clientId,
  currency: values.currency,
  department: values.department,
  description: values.description,
  employmentType: values.employmentType,
  headcount: emptyToUndefined(values.headcount),
  intakeSummary: values.intakeSummary,
  location: values.location,
  ownerUserId: values.ownerUserId,
  placementFeePercent: emptyToUndefined(values.placementFeePercent),
  priority: emptyToUndefined(values.priority),
  salaryMax: emptyToUndefined(values.salaryMax),
  salaryMin: emptyToUndefined(values.salaryMin),
  status: emptyToUndefined(values.status),
  targetFillDate: emptyToUndefined(values.targetFillDate),
  title: values.title,
});

const requestJobMutation = async ({
  jobId,
  mode,
  values,
}: {
  jobId?: string;
  mode: JobMutationMode;
  values: JobFormValues;
}) => {
  const parsedPayload = jobMutationRequestSchema.safeParse(
    getJobPayload(values),
  );

  if (!parsedPayload.success) {
    throw new Error(parsedPayload.error.issues[0]?.message ?? "Invalid job form");
  }

  return fetchJson<JobMutationResponse>(
    mode === "create" ? "/api/jobs" : `/api/jobs/${jobId}`,
    {
      body: JSON.stringify(parsedPayload.data),
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      method: mode === "create" ? "POST" : "PATCH",
    },
  );
};

const requestJobStageRepair = async (jobId: string) =>
  fetchJson<JobStageRepairResponse>(`/api/jobs/${jobId}/stages/repair`, {
    method: "POST",
  });

export const useJobsCacheActions = () => {
  const queryClient = useQueryClient();

  const invalidateJobsList = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: jobsListRootQueryKey,
      refetchType: "active",
    });
  }, [queryClient]);

  const removeJobsListCache = useCallback(() => {
    queryClient.removeQueries({
      queryKey: jobsListRootQueryKey,
      type: "inactive",
    });
  }, [queryClient]);

  const setJobDetailCache = useCallback(
    (detail: JobDetailResponse) => {
      queryClient.setQueryData(jobDetailQueryKey(detail.job.id), detail);
    },
    [queryClient],
  );

  return {
    invalidateJobsList,
    removeJobsListCache,
    setJobDetailCache,
  };
};

export const useJobMutation = ({
  jobId,
  mode,
  onSuccess,
}: UseJobMutationOptions) => {
  const router = useRouter();
  const { invalidateJobsList, removeJobsListCache, setJobDetailCache } =
    useJobsCacheActions();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (values: JobFormValues) =>
      requestJobMutation({ jobId, mode, values }),
    onMutate: () => {
      setError(null);
    },
    onSuccess: async (response) => {
      setJobDetailCache(response);
      removeJobsListCache();
      await invalidateJobsList();
      await onSuccess?.(response);
    },
    onError: (mutationError) => {
      if (isApiRequestError(mutationError) && mutationError.status === 401) {
        router.push("/sign-in");
        return;
      }

      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to save job.",
      );
    },
  });

  return {
    error,
    isPending: mutation.isPending,
    saveJob: mutation.mutate,
  };
};

export const useJobStageRepairMutation = ({
  jobId,
  onSuccess,
}: UseJobStageRepairMutationOptions) => {
  const router = useRouter();
  const { invalidateJobsList, setJobDetailCache } = useJobsCacheActions();
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => requestJobStageRepair(jobId),
    onMutate: () => {
      setError(null);
    },
    onSuccess: async (response) => {
      setJobDetailCache(response);
      await invalidateJobsList();
      await onSuccess?.(response);
    },
    onError: (mutationError) => {
      if (isApiRequestError(mutationError) && mutationError.status === 401) {
        router.push("/sign-in");
        return;
      }

      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to repair job stage template.",
      );
    },
  });

  return {
    error,
    isPending: mutation.isPending,
    repairStageTemplate: mutation.mutate,
  };
};
