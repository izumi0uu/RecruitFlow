import {
  type ApiDocumentEntityType,
  type ApiDocumentType,
  apiDocumentEntityTypeValues,
  apiDocumentTypeValues,
} from "@recruitflow/contracts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { DocumentMetadataFormController } from "../components/DocumentMetadataFormController";
import { buildDocumentMetadataFormValues } from "../components/documentMetadataFormValues";

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const getSingleParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const parseEntityType = (
  value: string | string[] | undefined,
): ApiDocumentEntityType | "" => {
  const entityType = getSingleParamValue(value);

  return apiDocumentEntityTypeValues.includes(
    entityType as ApiDocumentEntityType,
  )
    ? (entityType as ApiDocumentEntityType)
    : "";
};

const parseDocumentType = (
  value: string | string[] | undefined,
  entityType: ApiDocumentEntityType | "",
): ApiDocumentType | "" => {
  const type = getSingleParamValue(value);

  if (apiDocumentTypeValues.includes(type as ApiDocumentType)) {
    return type as ApiDocumentType;
  }

  if (entityType === "candidate") {
    return "resume";
  }

  if (entityType === "job") {
    return "jd";
  }

  return "";
};

const getCancelHref = (
  entityType: ApiDocumentEntityType | "",
  entityId: string,
) => {
  if (entityType === "candidate" && entityId) {
    return `/candidates/${entityId}`;
  }

  if (entityType === "job" && entityId) {
    return `/jobs/${entityId}`;
  }

  return "/documents";
};

const NewDocumentPage = async ({ searchParams }: PageProps) => {
  const params = await Promise.resolve(searchParams ?? {});
  const entityType = parseEntityType(params.entityType);
  const entityId = getSingleParamValue(params.entityId) ?? "";
  const type = parseDocumentType(params.type, entityType);

  return (
    <section className="space-y-6 px-0 py-1 lg:py-2">
      <WorkspacePageHeader
        kicker="Document metadata"
        title="Add document metadata"
        description="Register a resume, JD, call note, or interview note against a workspace entity without taking ownership of binary upload transport yet."
      />

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Metadata-only upload checkpoint</CardTitle>
          <CardDescription>
            This flow creates the document row, links it through
            entityType/entityId, and writes the upload audit event in the API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentMetadataFormController
            cancelHref={getCancelHref(entityType, entityId)}
            initialValues={buildDocumentMetadataFormValues({
              entityId,
              entityType,
              type,
            })}
          />
        </CardContent>
      </Card>
    </section>
  );
};

export default NewDocumentPage;
