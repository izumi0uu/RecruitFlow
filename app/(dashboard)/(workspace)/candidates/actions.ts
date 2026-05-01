"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  candidateMutationRequestSchema,
  candidateParamsSchema,
  type CandidateMutationResponse,
} from "@recruitflow/contracts";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";

export type CandidateFormValues = {
  currentCompany: string;
  currentTitle: string;
  email: string;
  fullName: string;
  headline: string;
  linkedinUrl: string;
  location: string;
  noticePeriod: string;
  ownerUserId: string;
  phone: string;
  portfolioUrl: string;
  salaryExpectation: string;
  skillsText: string;
  source: string;
};

export type CandidateFormState = {
  error?: string;
  values?: CandidateFormValues;
};

const getString = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value : "";

const getCandidateFormValues = (formData: FormData): CandidateFormValues => ({
  currentCompany: getString(formData.get("currentCompany")),
  currentTitle: getString(formData.get("currentTitle")),
  email: getString(formData.get("email")),
  fullName: getString(formData.get("fullName")),
  headline: getString(formData.get("headline")),
  linkedinUrl: getString(formData.get("linkedinUrl")),
  location: getString(formData.get("location")),
  noticePeriod: getString(formData.get("noticePeriod")),
  ownerUserId: getString(formData.get("ownerUserId")),
  phone: getString(formData.get("phone")),
  portfolioUrl: getString(formData.get("portfolioUrl")),
  salaryExpectation: getString(formData.get("salaryExpectation")),
  skillsText: getString(formData.get("skillsText")),
  source: getString(formData.get("source")),
});

const getCandidatePayload = (values: CandidateFormValues) => ({
  currentCompany: values.currentCompany,
  currentTitle: values.currentTitle,
  email: values.email,
  fullName: values.fullName,
  headline: values.headline,
  linkedinUrl: values.linkedinUrl,
  location: values.location,
  noticePeriod: values.noticePeriod,
  ownerUserId: values.ownerUserId,
  phone: values.phone,
  portfolioUrl: values.portfolioUrl,
  salaryExpectation: values.salaryExpectation,
  skillsText: values.skillsText,
  source: values.source,
});

const parseCandidateForm = (formData: FormData) => {
  const values = getCandidateFormValues(formData);
  const parsedPayload = candidateMutationRequestSchema.safeParse(
    getCandidatePayload(values),
  );

  if (!parsedPayload.success) {
    return {
      error:
        parsedPayload.error.issues[0]?.message ?? "Invalid candidate form",
      values,
    };
  }

  return {
    data: parsedPayload.data,
    values,
  };
};

const toActionError = (error: unknown, values: CandidateFormValues) => {
  if (isApiRequestError(error)) {
    if (error.status === 401) {
      redirect("/sign-in");
    }

    if (error.status === 403) {
      return {
        error:
          "Only workspace members with coordinator access or higher can save candidate profiles.",
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

export const createCandidateAction = async (
  _previousState: CandidateFormState,
  formData: FormData,
): Promise<CandidateFormState> => {
  const parsedForm = parseCandidateForm(formData);

  if ("error" in parsedForm) {
    return parsedForm;
  }

  let createdCandidate: CandidateMutationResponse;

  try {
    createdCandidate = await requestApiJson<CandidateMutationResponse>(
      "/candidates",
      {
        method: "POST",
        json: parsedForm.data,
      },
    );
  } catch (error) {
    return toActionError(error, parsedForm.values);
  }

  revalidatePath("/candidates");
  redirect(`/candidates/${createdCandidate.candidate.id}/edit?created=1`);
};

export const updateCandidateAction = async (
  _previousState: CandidateFormState,
  formData: FormData,
): Promise<CandidateFormState> => {
  const values = getCandidateFormValues(formData);
  const parsedParams = candidateParamsSchema.safeParse({
    candidateId: getString(formData.get("candidateId")),
  });

  if (!parsedParams.success) {
    return {
      error: "Candidate id is missing or invalid.",
      values,
    };
  }

  const parsedForm = parseCandidateForm(formData);

  if ("error" in parsedForm) {
    return parsedForm;
  }

  try {
    await requestApiJson<CandidateMutationResponse>(
      `/candidates/${parsedParams.data.candidateId}`,
      {
        method: "PATCH",
        json: parsedForm.data,
      },
    );
  } catch (error) {
    return toActionError(error, parsedForm.values);
  }

  revalidatePath("/candidates");
  revalidatePath(`/candidates/${parsedParams.data.candidateId}/edit`);
  redirect("/candidates");
};
