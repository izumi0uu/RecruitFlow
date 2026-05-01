"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  jobMutationRequestSchema,
  jobParamsSchema,
  type ApiJobPriority,
  type ApiJobStatus,
  type JobMutationResponse,
  type JobStageRepairResponse,
} from "@recruitflow/contracts";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";
import { emptyStringToUndefined, getFormString } from "@/lib/form-data";

export type JobFormValues = {
  clientId: string;
  currency: string;
  department: string;
  description: string;
  employmentType: string;
  headcount: string;
  intakeSummary: string;
  location: string;
  ownerUserId: string;
  placementFeePercent: string;
  priority: ApiJobPriority | "";
  salaryMax: string;
  salaryMin: string;
  status: ApiJobStatus | "";
  targetFillDate: string;
  title: string;
};

export type JobFormState = {
  error?: string;
  values?: JobFormValues;
};

const getJobFormValues = (formData: FormData): JobFormValues => ({
  clientId: getFormString(formData, "clientId"),
  currency: getFormString(formData, "currency"),
  department: getFormString(formData, "department"),
  description: getFormString(formData, "description"),
  employmentType: getFormString(formData, "employmentType"),
  headcount: getFormString(formData, "headcount"),
  intakeSummary: getFormString(formData, "intakeSummary"),
  location: getFormString(formData, "location"),
  ownerUserId: getFormString(formData, "ownerUserId"),
  placementFeePercent: getFormString(formData, "placementFeePercent"),
  priority: getFormString(formData, "priority") as ApiJobPriority | "",
  salaryMax: getFormString(formData, "salaryMax"),
  salaryMin: getFormString(formData, "salaryMin"),
  status: getFormString(formData, "status") as ApiJobStatus | "",
  targetFillDate: getFormString(formData, "targetFillDate"),
  title: getFormString(formData, "title"),
});

const getJobPayload = (values: JobFormValues) => ({
  clientId: values.clientId,
  currency: values.currency,
  department: values.department,
  description: values.description,
  employmentType: values.employmentType,
  headcount: emptyStringToUndefined(values.headcount),
  intakeSummary: values.intakeSummary,
  location: values.location,
  ownerUserId: values.ownerUserId,
  placementFeePercent: emptyStringToUndefined(values.placementFeePercent),
  priority: emptyStringToUndefined(values.priority),
  salaryMax: emptyStringToUndefined(values.salaryMax),
  salaryMin: emptyStringToUndefined(values.salaryMin),
  status: emptyStringToUndefined(values.status),
  targetFillDate: emptyStringToUndefined(values.targetFillDate),
  title: values.title,
});

const parseJobForm = (formData: FormData) => {
  const values = getJobFormValues(formData);
  const parsedPayload = jobMutationRequestSchema.safeParse(
    getJobPayload(values),
  );

  if (!parsedPayload.success) {
    return {
      error: parsedPayload.error.issues[0]?.message ?? "Invalid job form",
      values,
    };
  }

  return {
    data: parsedPayload.data,
    values,
  };
};

const toActionError = (error: unknown, values: JobFormValues) => {
  if (isApiRequestError(error)) {
    if (error.status === 401) {
      redirect("/sign-in");
    }

    if (error.status === 403) {
      return {
        error: "Only owners and recruiters can save jobs in this workspace.",
        values,
      };
    }

    return {
      error: error.message,
      values,
    };
  }

  throw error;
};

export const createJobAction = async (
  _previousState: JobFormState,
  formData: FormData,
): Promise<JobFormState> => {
  const parsedForm = parseJobForm(formData);

  if ("error" in parsedForm) {
    return parsedForm;
  }

  let createdJob: JobMutationResponse;

  try {
    createdJob = await requestApiJson<JobMutationResponse>("/jobs", {
      method: "POST",
      json: parsedForm.data,
    });
  } catch (error) {
    return toActionError(error, parsedForm.values);
  }

  revalidatePath("/jobs");
  redirect(`/jobs/${createdJob.job.id}/edit?created=1`);
};

export const updateJobAction = async (
  _previousState: JobFormState,
  formData: FormData,
): Promise<JobFormState> => {
  const values = getJobFormValues(formData);
  const parsedParams = jobParamsSchema.safeParse({
    jobId: getFormString(formData, "jobId"),
  });

  if (!parsedParams.success) {
    return {
      error: "Job id is missing or invalid.",
      values,
    };
  }

  const parsedForm = parseJobForm(formData);

  if ("error" in parsedForm) {
    return parsedForm;
  }

  try {
    await requestApiJson<JobMutationResponse>(
      `/jobs/${parsedParams.data.jobId}`,
      {
        method: "PATCH",
        json: parsedForm.data,
      },
    );
  } catch (error) {
    return toActionError(error, parsedForm.values);
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${parsedParams.data.jobId}/edit`);
  redirect("/jobs");
};

export const updateJobControlsAction = async (formData: FormData) => {
  const parsedParams = jobParamsSchema.safeParse({
    jobId: getFormString(formData, "jobId"),
  });

  if (!parsedParams.success) {
    throw new Error("Job id is missing or invalid.");
  }

  const parsedForm = parseJobForm(formData);

  if ("error" in parsedForm) {
    throw new Error(parsedForm.error);
  }

  try {
    await requestApiJson<JobMutationResponse>(
      `/jobs/${parsedParams.data.jobId}`,
      {
        method: "PATCH",
        json: parsedForm.data,
      },
    );
  } catch (error) {
    if (isApiRequestError(error) && error.status === 401) {
      redirect("/sign-in");
    }

    if (isApiRequestError(error) && error.status === 403) {
      redirect(`/jobs/${parsedParams.data.jobId}?restricted=1`);
    }

    throw error;
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${parsedParams.data.jobId}`);
  revalidatePath(`/jobs/${parsedParams.data.jobId}/edit`);
  redirect(`/jobs/${parsedParams.data.jobId}`);
};

export const repairJobStageTemplateAction = async (formData: FormData) => {
  const parsedParams = jobParamsSchema.safeParse({
    jobId: getFormString(formData, "jobId"),
  });

  if (!parsedParams.success) {
    throw new Error("Job id is missing or invalid.");
  }

  try {
    await requestApiJson<JobStageRepairResponse>(
      `/jobs/${parsedParams.data.jobId}/stages/repair`,
      {
        method: "POST",
      },
    );
  } catch (error) {
    if (isApiRequestError(error) && error.status === 401) {
      redirect("/sign-in");
    }

    if (isApiRequestError(error) && error.status === 403) {
      redirect(`/jobs/${parsedParams.data.jobId}/edit?restricted=1`);
    }

    throw error;
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${parsedParams.data.jobId}/edit`);
  redirect(`/jobs/${parsedParams.data.jobId}/edit`);
};
