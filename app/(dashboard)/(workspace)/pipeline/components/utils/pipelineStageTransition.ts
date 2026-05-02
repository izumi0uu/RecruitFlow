import {
  type ApiSubmissionStage,
  type SubmissionMutationResponse,
  submissionStageTransitionRequestSchema,
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

  return `Stage update failed with status ${response.status}`;
};

export const requestSubmissionStageTransition = async (
  submissionId: string,
  stage: ApiSubmissionStage,
) => {
  const parsedPayload = submissionStageTransitionRequestSchema.safeParse({
    stage,
  });

  if (!parsedPayload.success) {
    throw new Error(
      parsedPayload.error.issues[0]?.message ?? "Invalid stage transition",
    );
  }

  const response = await fetch(`/api/submissions/${submissionId}/stage`, {
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
