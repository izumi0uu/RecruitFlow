import { isApiRequestError } from "@/lib/api/errors";

const toBffErrorResponse = (error: unknown) => {
  if (isApiRequestError(error)) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  throw error;
};

const withBffApiErrorResponse = async (
  handler: () => Promise<Response>,
) => {
  try {
    return await handler();
  } catch (error) {
    return toBffErrorResponse(error);
  }
};

export { withBffApiErrorResponse };
