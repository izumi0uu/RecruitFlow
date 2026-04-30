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

const getString = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value : "";

const emptyToUndefined = (value: string) => {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

const getJobFormValues = (formData: FormData): JobFormValues => ({
  clientId: getString(formData.get("clientId")),
  currency: getString(formData.get("currency")),
  department: getString(formData.get("department")),
  description: getString(formData.get("description")),
  employmentType: getString(formData.get("employmentType")),
  headcount: getString(formData.get("headcount")),
  intakeSummary: getString(formData.get("intakeSummary")),
  location: getString(formData.get("location")),
  ownerUserId: getString(formData.get("ownerUserId")),
  placementFeePercent: getString(formData.get("placementFeePercent")),
  priority: getString(formData.get("priority")) as ApiJobPriority | "",
  salaryMax: getString(formData.get("salaryMax")),
  salaryMin: getString(formData.get("salaryMin")),
  status: getString(formData.get("status")) as ApiJobStatus | "",
  targetFillDate: getString(formData.get("targetFillDate")),
  title: getString(formData.get("title")),
});

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
    jobId: getString(formData.get("jobId")),
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

export const repairJobStageTemplateAction = async (formData: FormData) => {
  const parsedParams = jobParamsSchema.safeParse({
    jobId: getString(formData.get("jobId")),
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

    throw error;
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${parsedParams.data.jobId}/edit`);
  redirect(`/jobs/${parsedParams.data.jobId}/edit`);
};
