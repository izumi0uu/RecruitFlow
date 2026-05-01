"use client";

import { useActionState } from "react";

import type { ContactFormState, ContactFormValues } from "../../actions";

type ContactFormAction = (
  previousState: ContactFormState,
  formData: FormData,
) => Promise<ContactFormState>;

type UseContactFormStateOptions = {
  action: ContactFormAction;
  initialValues: ContactFormValues;
};

const emptyContactFormValues: ContactFormValues = {
  email: "",
  fullName: "",
  isPrimary: false,
  linkedinUrl: "",
  phone: "",
  relationshipType: "",
  title: "",
};

const useContactFormState = ({
  action,
  initialValues,
}: UseContactFormStateOptions) => {
  const [state, formAction, isPending] = useActionState<
    ContactFormState,
    FormData
  >(action, {});
  const values = {
    ...emptyContactFormValues,
    ...initialValues,
    ...(state.values ?? {}),
  };

  return {
    formAction,
    isPending,
    state,
    values,
  };
};

export { emptyContactFormValues, useContactFormState };
