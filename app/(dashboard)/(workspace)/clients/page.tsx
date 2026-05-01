import { redirect } from "next/navigation";

import type { ClientsListResponse } from "@recruitflow/contracts";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";
import {
  clientListFiltersToSearchParams,
  parseClientListFiltersFromRecord,
  type ClientListFilters,
} from "@/lib/clients/filters";

import { ClientsListSurface } from "./components/ClientsListSurface";

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const buildClientsApiPath = (filters: ClientListFilters) => {
  const queryString = clientListFiltersToSearchParams(filters, {
    includePageSize: true,
  }).toString();

  return `/clients${queryString ? `?${queryString}` : ""}`;
};

const getClientsList = async (filters: ClientListFilters) => {
  try {
    return await requestApiJson<ClientsListResponse>(
      buildClientsApiPath(filters),
    );
  } catch (error) {
    if (isApiRequestError(error) && error.status === 401) {
      redirect("/sign-in");
    }

    throw error;
  }
};

const ClientsPage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});
  const initialFilters = parseClientListFiltersFromRecord(params);
  const clientsList = await getClientsList(initialFilters);

  return (
    <ClientsListSurface
      initialData={clientsList}
      initialFilters={initialFilters}
    />
  );
};

export default ClientsPage;
