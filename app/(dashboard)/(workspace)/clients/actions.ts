"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  clientContactMutationRequestSchema,
  clientContactParamsSchema,
  type ClientContactMutationResponse,
} from "@recruitflow/contracts";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";

export type ContactFormValues = {
  email: string;
  fullName: string;
  isPrimary: boolean;
  linkedinUrl: string;
  phone: string;
  relationshipType: string;
  title: string;
};

export type ContactFormState = {
  error?: string;
  values?: ContactFormValues;
};

const getString = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value : "";

const getContactFormValues = (formData: FormData): ContactFormValues => ({
  email: getString(formData.get("email")),
  fullName: getString(formData.get("fullName")),
  isPrimary: formData.get("isPrimary") === "on",
  linkedinUrl: getString(formData.get("linkedinUrl")),
  phone: getString(formData.get("phone")),
  relationshipType: getString(formData.get("relationshipType")),
  title: getString(formData.get("title")),
});

const parseContactForm = (formData: FormData) => {
  const values = getContactFormValues(formData);
  const parsedPayload = clientContactMutationRequestSchema.safeParse(values);

  if (!parsedPayload.success) {
    return {
      error:
        parsedPayload.error.issues[0]?.message ?? "Invalid contact form",
      values,
    };
  }

  return {
    data: parsedPayload.data,
    values,
  };
};

const toContactActionError = (
  error: unknown,
  values: ContactFormValues,
) => {
  if (isApiRequestError(error)) {
    if (error.status === 401) {
      redirect("/sign-in");
    }

    if (error.status === 403) {
      return {
        error: "You do not have permission to save contacts in this workspace.",
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

export const updateContactAction = async (
  _previousState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> => {
  const values = getContactFormValues(formData);
  const parsedParams = clientContactParamsSchema.safeParse({
    clientId: getString(formData.get("clientId")),
    contactId: getString(formData.get("contactId")),
  });

  if (!parsedParams.success) {
    return {
      error: "Client contact id is missing or invalid.",
      values,
    };
  }

  const parsedForm = parseContactForm(formData);

  if ("error" in parsedForm) {
    return parsedForm;
  }

  try {
    await requestApiJson<ClientContactMutationResponse>(
      `/clients/${parsedParams.data.clientId}/contacts/${parsedParams.data.contactId}`,
      {
        method: "PATCH",
        json: parsedForm.data,
      },
    );
  } catch (error) {
    return toContactActionError(error, parsedForm.values);
  }

  revalidatePath(`/clients/${parsedParams.data.clientId}`);
  revalidatePath(
    `/clients/${parsedParams.data.clientId}/contacts/${parsedParams.data.contactId}/edit`,
  );
  redirect(`/clients/${parsedParams.data.clientId}`);
};
