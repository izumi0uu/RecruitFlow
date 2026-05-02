"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";

import {
  clientMutationRequestSchema,
  type ApiClientEditableStatus,
  type ApiClientPriority,
  type ClientMutationRequest,
  type ClientMutationResponse,
  type ClientsListOwnerOption,
} from "@recruitflow/contracts";

import { emptyStringToUndefined } from "@/lib/form-data";
import { getApiErrorMessage } from "@/lib/api/errors";

import {
  clientEditablePriorityOptions,
  clientEditableStatusOptions,
} from "../../utils";
import { useClientsCacheActions } from "./useClientMutations";

type UseClientCreateDialogOptions = {
  canManageClientControls: boolean;
  onClientCreated: (client: ClientMutationResponse) => void;
  ownerOptions: ClientsListOwnerOption[];
};

export type ClientCreateValues = {
  hqLocation: string;
  industry: string;
  name: string;
  notesPreview: string;
  ownerUserId: string;
  priority: ApiClientPriority;
  status: ApiClientEditableStatus;
  website: string;
};

const emptyValues: ClientCreateValues = {
  hqLocation: "",
  industry: "",
  name: "",
  notesPreview: "",
  ownerUserId: "",
  priority: "medium",
  status: "active",
  website: "",
};

const getClientPayload = (
  values: ClientCreateValues,
  canManageClientControls: boolean,
) => {
  return {
    hqLocation: values.hqLocation,
    industry: values.industry,
    name: values.name,
    notesPreview: values.notesPreview,
    ownerUserId: canManageClientControls
      ? emptyStringToUndefined(values.ownerUserId)
      : undefined,
    priority: canManageClientControls ? values.priority : "medium",
    status: canManageClientControls ? values.status : "active",
    website: values.website,
  };
};

const createClient = async (payload: ClientMutationRequest) => {
  const response = await fetch("/api/clients", {
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

  return body as ClientMutationResponse;
};

const useClientCreateDialog = ({
  canManageClientControls,
  onClientCreated,
  ownerOptions,
}: UseClientCreateDialogOptions) => {
  const { invalidateClientsList } = useClientsCacheActions();
  const [values, setValues] = React.useState<ClientCreateValues>(emptyValues);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const { isPending, mutate } = useMutation({
    mutationFn: createClient,
    onError: (caughtError) => {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create client.",
      );
    },
    onSuccess: async (createdClient) => {
      setValues(emptyValues);
      setSuccess(createdClient.message);
      await invalidateClientsList();
      onClientCreated(createdClient);
    },
  });
  const ownerSelectOptions = React.useMemo(
    () => [
      { label: "Default to me", value: "" },
      ...ownerOptions.map((owner) => ({
        label: owner.name ?? owner.email,
        value: owner.id,
      })),
    ],
    [ownerOptions],
  );

  const updateValue = React.useCallback(
    (name: keyof ClientCreateValues, value: string) => {
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

      const parsedPayload = clientMutationRequestSchema.safeParse(
        getClientPayload(values, canManageClientControls),
      );

      if (!parsedPayload.success) {
        setError(
          parsedPayload.error.issues[0]?.message ?? "Invalid client payload.",
        );
        return;
      }

      mutate(parsedPayload.data);
    },
    [canManageClientControls, mutate, values],
  );

  return {
    error,
    handleSubmit,
    isPending,
    ownerSelectOptions,
    priorityOptions: clientEditablePriorityOptions,
    statusOptions: clientEditableStatusOptions,
    success,
    updateValue,
    values,
  };
};

export { useClientCreateDialog };
