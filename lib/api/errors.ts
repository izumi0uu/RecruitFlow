type ApiErrorBody = {
  error?: string;
  message?: string | string[];
};

class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

const isApiRequestError = (error: unknown): error is ApiRequestError =>
  error instanceof ApiRequestError;

const getApiErrorMessage = (body: unknown, fallbackStatus: number) => {
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

const readApiResponseBody = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json().catch(() => null);
  }

  return response.text().catch(() => "");
};

export {
  ApiRequestError,
  getApiErrorMessage,
  isApiRequestError,
  readApiResponseBody,
};
