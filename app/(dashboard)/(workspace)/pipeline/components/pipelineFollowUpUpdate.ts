import {
  type SubmissionFollowUpUpdateRequest,
  type SubmissionMutationResponse,
  submissionFollowUpUpdateRequestSchema,
} from "@recruitflow/contracts";

const getMutationErrorMessage = async (response: Response) => {
  try {
    const body = (await response.json()) as { error?: string };

    if (body.error) {
      return body.error;
    }
  } catch {
    // Fall through to the generic status message.
  }

  return `Follow-up update failed with status ${response.status}`;
};

export const requestSubmissionFollowUpUpdate = async (
  submissionId: string,
  input: SubmissionFollowUpUpdateRequest,
) => {
  const parsedPayload = submissionFollowUpUpdateRequestSchema.safeParse(input);

  if (!parsedPayload.success) {
    throw new Error(
      parsedPayload.error.issues[0]?.message ?? "Invalid follow-up update",
    );
  }

  const response = await fetch(`/api/submissions/${submissionId}/follow-up`, {
    body: JSON.stringify(parsedPayload.data),
    headers: {
      "content-type": "application/json",
    },
    method: "PATCH",
  });

  if (response.status === 401) {
    throw new Error("UNAUTHENTICATED");
  }

  if (!response.ok) {
    throw new Error(await getMutationErrorMessage(response));
  }

  return (await response.json()) as SubmissionMutationResponse;
};
