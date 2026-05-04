const workspaceRouteHistoryKey = "recruitflow:workspace-route-history";
const maxWorkspaceRouteHistoryEntries = 12;

const isWorkspaceHref = (value: unknown): value is string => {
  return typeof value === "string" && value.startsWith("/");
};

const readWorkspaceRouteHistory = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawHistory = window.sessionStorage.getItem(workspaceRouteHistoryKey);
    const parsedHistory = rawHistory ? JSON.parse(rawHistory) : [];

    return Array.isArray(parsedHistory)
      ? parsedHistory.filter(isWorkspaceHref)
      : [];
  } catch {
    return [];
  }
};

const writeWorkspaceRouteHistory = (history: string[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    workspaceRouteHistoryKey,
    JSON.stringify(history.slice(-maxWorkspaceRouteHistoryEntries)),
  );
};

const appendWorkspaceRouteHistory = (currentHref: string) => {
  if (!currentHref) {
    return;
  }

  const history = readWorkspaceRouteHistory();
  const lastHref = history.at(-1);

  if (lastHref === currentHref) {
    return;
  }

  const existingIndex = history.lastIndexOf(currentHref);
  const nextHistory =
    existingIndex >= 0
      ? history.slice(0, existingIndex + 1)
      : [...history, currentHref];

  writeWorkspaceRouteHistory(nextHistory);
};

const hasPreviousWorkspaceRoute = (currentHref: string) => {
  const history = readWorkspaceRouteHistory();
  const currentIndex =
    history.at(-1) === currentHref
      ? history.length - 1
      : history.lastIndexOf(currentHref);

  return currentIndex > 0;
};

export { appendWorkspaceRouteHistory, hasPreviousWorkspaceRoute };
