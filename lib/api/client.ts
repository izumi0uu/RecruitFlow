import { getInternalApiOrigin, loadRootEnv } from "@recruitflow/config";
import { cookies } from "next/headers";

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

type ApiRequestInit = Omit<RequestInit, "body"> & {
  body?: BodyInit | null;
  json?: unknown;
};

const buildApiRequestInit = async (init: ApiRequestInit = {}) => {
  const headers = new Headers(init.headers);
  const cookieHeader = await getCookieHeader();

  if (cookieHeader && !headers.has("cookie")) {
    headers.set("cookie", cookieHeader);
  }

  let body = init.body ?? null;

  if (init.json !== undefined) {
    body = JSON.stringify(init.json);

    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
  }

  return {
    body,
    headers,
  };
};

export async function requestApiResponse(
  pathname: string,
  init: ApiRequestInit = {},
) {
  const preparedInit = await buildApiRequestInit(init);

  return fetch(toApiUrl(pathname), {
    ...init,
    ...preparedInit,
    cache: "no-store",
  });
}

export async function requestApiJson<T>(
  pathname: string,
  init: ApiRequestInit = {},
) {
  const headers = new Headers(init.headers);

  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  const response = await requestApiResponse(pathname, {
    ...init,
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
