"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";

import {
  clientContactMutationRequestSchema,
  type ClientContactMutationRequest,
  type ClientContactMutationResponse,
} from "@recruitflow/contracts";

import { getApiErrorMessage } from "@/utils/apiErrors";

type UseClientContactCreateDialogOptions = {
  clientId: string;
  defaultIsPrimary: boolean;
  onContactCreated: (contact: ClientContactMutationResponse) => void;
  open: boolean;
};

export type ContactCreateValues = {
  email: string;
  fullName: string;
  isPrimary: boolean;
  linkedinUrl: string;
  phone: string;
  relationshipType: string;
  title: string;
};

const getEmptyValues = (defaultIsPrimary: boolean): ContactCreateValues => ({
  email: "",
  fullName: "",
  isPrimary: defaultIsPrimary,
  linkedinUrl: "",
  phone: "",
  relationshipType: "",
  title: "",
});

const createClientContact = async ({
  clientId,
  payload,
}: {
  clientId: string;
  payload: ClientContactMutationRequest;
}) => {
  const response = await fetch(`/api/clients/${clientId}/contacts`, {
    body: JSON.stringify(payload),
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    method: "POST",
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(body, response.status));
  }

  return body as ClientContactMutationResponse;
};

const useClientContactCreateDialog = ({
  clientId,
  defaultIsPrimary,
  onContactCreated,
  open,
}: UseClientContactCreateDialogOptions) => {
  const [values, setValues] = React.useState<ContactCreateValues>(
    getEmptyValues(defaultIsPrimary),
  );
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const { isPending, mutate } = useMutation({
    mutationFn: createClientContact,
    onError: (caughtError) => {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create contact.",
      );
    },
    onSuccess: (createdContact) => {
      setValues(getEmptyValues(false));
      setSuccess(createdContact.message);
      onContactCreated(createdContact);
    },
  });

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setValues(getEmptyValues(defaultIsPrimary));
    setError(null);
    setSuccess(null);
  }, [defaultIsPrimary, open]);

  const updateValue = React.useCallback(
    (name: keyof ContactCreateValues, value: string | boolean) => {
      setValues((currentValues) => ({
        ...currentValues,
        [name]: value,
      }));
      setError(null);
      setSuccess(null);
    },
    [],
  );

  const handleSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
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

      mutate({
        clientId,
        payload: parsedPayload.data,
      });
    },
    [clientId, mutate, values],
  );

  return {
    error,
    handleSubmit,
    isPending,
    success,
    updateValue,
    values,
  };
};

export { useClientContactCreateDialog };
