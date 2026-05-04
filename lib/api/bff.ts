import { isApiRequestError } from "@/lib/api/errors";

const toBffErrorResponse = (error: unknown) => {
  if (isApiRequestError(error)) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  throw error;
};

const relayApiResponse = (response: Response) => {
  const headers = new Headers();

  for (const headerName of [
    "cache-control",
    "content-disposition",
    "content-length",
    "content-type",
    "x-request-id",
  ]) {
    const headerValue = response.headers.get(headerName);

    if (headerValue) {
      headers.set(headerName, headerValue);
    }
  }

  return new Response(response.body, {
    headers,
    status: response.status,
  });
};

const withBffApiErrorResponse = async (handler: () => Promise<Response>) => {
  try {
    return await handler();
  } catch (error) {
    return toBffErrorResponse(error);
  }
};

export { relayApiResponse, withBffApiErrorResponse };
