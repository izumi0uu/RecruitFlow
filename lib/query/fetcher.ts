import {
  ApiRequestError,
  getApiErrorMessage,
  readApiResponseBody,
} from "@/lib/api/errors";

export const fetchJson = async <T>(
  input: RequestInfo | URL,
  init?: RequestInit,
) => {
  const response = await fetch(input, init);

  if (!response.ok) {
    const body = await readApiResponseBody(response);

    throw new ApiRequestError(
      getApiErrorMessage(body, response.status),
      response.status,
      body,
    );
  }

  return (await response.json()) as T;
};
