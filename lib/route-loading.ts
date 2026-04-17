export const ROUTE_LOADING_START_EVENT = "recruitflow:route-loading:start";
export const ROUTE_LOADING_STOP_EVENT = "recruitflow:route-loading:stop";

export const startRouteLoading = () => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(ROUTE_LOADING_START_EVENT));
};

export const stopRouteLoading = () => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(ROUTE_LOADING_STOP_EVENT));
};
