"use client";

import * as React from "react";

import {
  clientContactMutationRequestSchema,
  type ClientContactMutationResponse,
} from "@recruitflow/contracts";

import {
  emptyContactFormValues,
  type ContactFormValues,
} from "../ContactForm";

import { useClientContactCreateMutation } from "./useClientMutations";

type UseClientContactCreateDialogOptions = {
  clientId: string;
  defaultIsPrimary: boolean;
  onContactCreated: (contact: ClientContactMutationResponse) => void;
  open: boolean;
};

const getEmptyValues = (defaultIsPrimary: boolean): ContactFormValues => ({
  ...emptyContactFormValues,
  isPrimary: defaultIsPrimary,
});

const useClientContactCreateDialog = ({
  clientId,
  defaultIsPrimary,
  onContactCreated,
  open,
}: UseClientContactCreateDialogOptions) => {
  const [formDefaultIsPrimary, setFormDefaultIsPrimary] =
    React.useState(defaultIsPrimary);
  const [resetVersion, setResetVersion] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const { createContact, error: mutationError, isPending } =
    useClientContactCreateMutation({
      clientId,
      onSuccess: (createdContact) => {
        setFormDefaultIsPrimary(false);
        setResetVersion((currentVersion) => currentVersion + 1);
        setSuccess(createdContact.message);
        onContactCreated(createdContact);
      },
    });
  const initialValues = React.useMemo(
    () => getEmptyValues(formDefaultIsPrimary),
    [formDefaultIsPrimary, resetVersion],
  );

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setFormDefaultIsPrimary(defaultIsPrimary);
    setResetVersion((currentVersion) => currentVersion + 1);
    setError(null);
    setSuccess(null);
  }, [defaultIsPrimary, open]);

  React.useEffect(() => {
    setError(mutationError);
  }, [mutationError]);

  const handleSubmit = React.useCallback(
    (values: ContactFormValues) => {
      setError(null);
      setSuccess(null);

      const parsedPayload =
        clientContactMutationRequestSchema.safeParse(values);

      if (!parsedPayload.success) {
        setError(
          parsedPayload.error.issues[0]?.message ??
            "Invalid client contact payload.",
        );
        return;
      }

      createContact(parsedPayload.data);
    },
    [createContact],
  );
  const handleValuesChange = React.useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  return {
    error,
    handleSubmit,
    handleValuesChange,
    initialValues,
    isPending,
    success,
  };
};

export { useClientContactCreateDialog };
