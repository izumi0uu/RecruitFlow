import { redirect } from "next/navigation";

import type { DocumentsListResponse } from "@recruitflow/contracts";

import { isApiRequestError, requestApiJson } from "@/lib/api/client";
import {
  documentListFiltersToSearchParams,
  parseDocumentListFiltersFromRecord,
  type DocumentListFilters,
} from "@/lib/documents/filters";

import { DocumentsListSurface } from "./components/DocumentsListSurface";

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const buildDocumentsApiPath = (filters: DocumentListFilters) => {
  const queryString = documentListFiltersToSearchParams(filters, {
    includePageSize: true,
  }).toString();

  return `/documents${queryString ? `?${queryString}` : ""}`;
};

const getDocumentsList = async (filters: DocumentListFilters) => {
  try {
    return await requestApiJson<DocumentsListResponse>(
      buildDocumentsApiPath(filters),
    );
  } catch (error) {
    if (isApiRequestError(error) && error.status === 401) {
      redirect("/sign-in");
    }

    throw error;
  }
};

const DocumentsPage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});
  const initialFilters = parseDocumentListFiltersFromRecord(params);
  const documentsList = await getDocumentsList(initialFilters);

  return (
    <DocumentsListSurface
      initialData={documentsList}
      initialFilters={initialFilters}
    />
  );
};

export default DocumentsPage;
