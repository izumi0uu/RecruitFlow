import { cookies } from "next/headers";

import { getInternalApiOrigin, loadRootEnv } from "@recruitflow/config";

type ApiErrorBody = {
  error?: string;
  message?: string | string[];
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

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

const getErrorMessage = (body: unknown, fallbackStatus: number) => {
  if (typeof body === "string" && body.trim()) {
    return body;
  }

  if (body && typeof body === "object") {
    const { error, message } = body as ApiErrorBody;

    if (typeof error === "string" && error.trim()) {
      return error;
    }

    if (Array.isArray(message) && message.length > 0) {
      return String(message[0]);
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return `Request failed with status ${fallbackStatus}`;
};

export const isApiRequestError = (
  error: unknown,
): error is ApiRequestError => error instanceof ApiRequestError;

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

  const contentType = response.headers.get("content-type") ?? "";
  const responseBody = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new ApiRequestError(
      getErrorMessage(responseBody, response.status),
      response.status,
      responseBody,
    );
  }

  return responseBody as T;
}
