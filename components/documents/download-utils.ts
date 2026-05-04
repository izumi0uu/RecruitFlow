type DownloadErrorBody = {
  code?: string;
  error?: string;
  message?: string | string[];
};

const getFileNameFromContentDisposition = (
  response: Response,
  fallbackFileName: string,
) => {
  const disposition = response.headers.get("content-disposition");

  if (!disposition) {
    return fallbackFileName;
  }

  const utf8FileNameMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8FileNameMatch?.[1]) {
    try {
      return decodeURIComponent(utf8FileNameMatch[1]);
    } catch {
      // Fall back to the regular filename token below.
    }
  }

  const fileNameMatch = disposition.match(/filename="?(.*?)"?(?:;|$)/i);

  return fileNameMatch?.[1] || fallbackFileName;
};

const triggerBrowserDownload = async (
  response: Response,
  fallbackFileName: string,
) => {
  const fileName = getFileNameFromContentDisposition(
    response,
    fallbackFileName,
  );
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 0);
};

const readDownloadFailure = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const body = (await response.json()) as DownloadErrorBody;
      const message = Array.isArray(body.message)
        ? body.message[0]
        : body.error || body.message;

      return {
        code: body.code ?? null,
        message:
          typeof message === "string" && message.trim()
            ? message
            : `Request failed with status ${response.status}`,
        status: response.status,
      };
    } catch {
      // Fall back to the generic error below.
    }
  }

  const text = await response.text().catch(() => "");

  return {
    code: null,
    message: text.trim() || `Request failed with status ${response.status}`,
    status: response.status,
  };
};

export { readDownloadFailure, triggerBrowserDownload };
