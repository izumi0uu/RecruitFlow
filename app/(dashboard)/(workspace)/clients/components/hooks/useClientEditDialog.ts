"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";

import {
  apiClientEditableStatusValues,
  apiClientPriorityValues,
  clientMutationRequestSchema,
  type ApiClientEditableStatus,
  type ApiClientPriority,
  type ClientMutationRequest,
  type ClientMutationResponse,
  type ClientRecord,
  type ClientsListOwnerOption,
} from "@recruitflow/contracts";

import { getApiErrorMessage } from "@/utils/apiErrors";

type UseClientEditDialogOptions = {
  canManageClientControls: boolean;
  client: ClientRecord | null;
  onClientUpdated: (client: ClientMutationResponse) => void;
  open: boolean;
  ownerOptions: ClientsListOwnerOption[];
};

export type ClientEditValues = {
  hqLocation: string;
  industry: string;
  name: string;
  notesPreview: string;
  ownerUserId: string;
  priority: ApiClientPriority;
  status: ApiClientEditableStatus;
  website: string;
};

const statusLabelMap: Record<ApiClientEditableStatus, string> = {
  active: "Active",
  paused: "Paused",
  prospect: "Prospect",
};

const priorityLabelMap: Record<ApiClientPriority, string> = {
  high: "High",
  low: "Low",
  medium: "Medium",
};

const statusOptions = apiClientEditableStatusValues.map((status) => ({
  label: statusLabelMap[status],
  value: status,
}));

const priorityOptions = apiClientPriorityValues.map((priority) => ({
  label: priorityLabelMap[priority],
  value: priority,
}));

const emptyToUndefined = (value: string) => {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

const getEditableStatus = (client: ClientRecord): ApiClientEditableStatus => {
  if (client.status === "archived") {
    return "paused";
  }

  return client.status;
};

const getInitialValues = (client: ClientRecord): ClientEditValues => ({
  hqLocation: client.hqLocation ?? "",
  industry: client.industry ?? "",
  name: client.name,
  notesPreview: client.notesPreview ?? "",
  ownerUserId: client.ownerUserId ?? "",
  priority: client.priority,
  status: getEditableStatus(client),
  website: client.website ?? "",
});

const getClientPayload = (
  values: ClientEditValues,
  client: ClientRecord,
  canManageClientControls: boolean,
) => {
  return {
    hqLocation: values.hqLocation,
    industry: values.industry,
    name: values.name,
    notesPreview: values.notesPreview,
    ownerUserId: canManageClientControls
      ? emptyToUndefined(values.ownerUserId)
      : client.ownerUserId ?? undefined,
    priority: canManageClientControls ? values.priority : client.priority,
    status: canManageClientControls ? values.status : getEditableStatus(client),
    website: values.website,
  };
};

const updateClient = async ({
  clientId,
  payload,
}: {
  clientId: string;
  payload: ClientMutationRequest;
}) => {
  const response = await fetch(`/api/clients/${clientId}`, {
    body: JSON.stringify(payload),
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    method: "PATCH",
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getApiErrorMessage(body, response.status));
  }

  return body as ClientMutationResponse;
};

const useClientEditDialog = ({
  canManageClientControls,
  client,
  onClientUpdated,
  open,
  ownerOptions,
}: UseClientEditDialogOptions) => {
  const [values, setValues] = React.useState<ClientEditValues | null>(
    client ? getInitialValues(client) : null,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const { isPending, mutate } = useMutation({
    mutationFn: updateClient,
    onError: (caughtError) => {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update client.",
      );
    },
    onSuccess: (updatedClient) => {
      setSuccess(updatedClient.message);
      onClientUpdated(updatedClient);
    },
  });
  const ownerSelectOptions = React.useMemo(
    () => [
      { label: "Keep current owner", value: "" },
      ...ownerOptions.map((owner) => ({
        label: owner.name ?? owner.email,
        value: owner.id,
      })),
    ],
    [ownerOptions],
  );

  React.useEffect(() => {
    if (!client || !open) {
      return;
    }

    setValues(getInitialValues(client));
    setError(null);
    setSuccess(null);
  }, [client, open]);

  const updateValue = React.useCallback(
    (name: keyof ClientEditValues, value: string) => {
      setValues((currentValues) =>
        currentValues
          ? {
              ...currentValues,
              [name]: value,
            }
          : currentValues,
      );
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

      if (!client || !values) {
        setError("Client is not ready to edit.");
        return;
      }

      const parsedPayload = clientMutationRequestSchema.safeParse(
        getClientPayload(values, client, canManageClientControls),
      );

      if (!parsedPayload.success) {
        setError(
          parsedPayload.error.issues[0]?.message ?? "Invalid client payload.",
        );
        return;
      }

      mutate({
        clientId: client.id,
        payload: parsedPayload.data,
      });
    },
    [canManageClientControls, client, mutate, values],
  );

  return {
    error,
    handleSubmit,
    isArchived: client?.status === "archived",
    isPending,
    ownerSelectOptions,
    priorityOptions,
    statusOptions,
    success,
    updateValue,
    values,
  };
};

export { useClientEditDialog };
