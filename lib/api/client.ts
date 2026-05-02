import { cookies } from "next/headers";

import { getInternalApiOrigin, loadRootEnv } from "@recruitflow/config";

import {
  ApiRequestError,
  getApiErrorMessage,
  isApiRequestError,
  readApiResponseBody,
} from "@/lib/api/errors";

const toApiUrl = (pathname: string) => {
  loadRootEnv();

  return new URL(pathname, getInternalApiOrigin());
};

const getCookieHeader = async () => {
  const cookieStore = await cookies();

  return cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${encodeURIComponent(cookie.value)}`)
    .join("; ");
};

export async function requestApiJson<T>(
  pathname: string,
  init: Omit<RequestInit, "body"> & {
    body?: BodyInit | null;
    json?: unknown;
  } = {},
) {
  const headers = new Headers(init.headers);
  const cookieHeader = await getCookieHeader();

  if (cookieHeader && !headers.has("cookie")) {
    headers.set("cookie", cookieHeader);
  }

  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  let body = init.body ?? null;

  if (init.json !== undefined) {
    body = JSON.stringify(init.json);

    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
  }

  const response = await fetch(toApiUrl(pathname), {
    ...init,
    body,
    cache: "no-store",
    headers,
  });

  const responseBody = await readApiResponseBody(response);

  if (!response.ok) {
    throw new ApiRequestError(
      getApiErrorMessage(responseBody, response.status),
      response.status,
      responseBody,
    );
  }

  return responseBody as T;
}

export { ApiRequestError, isApiRequestError };
