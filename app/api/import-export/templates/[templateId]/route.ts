import type { NextRequest } from "next/server";

import {
  getImportExportTemplateCsv,
  getImportExportTemplateDefinition,
} from "@/lib/import-export/templates";

type RouteContext = {
  params: Promise<{
    templateId: string;
  }>;
};

export const GET = async (_request: NextRequest, context: RouteContext) => {
  const { templateId } = await context.params;
  const template = getImportExportTemplateDefinition(templateId);

  if (!template) {
    return Response.json(
      { error: "Import/export template not found" },
      { status: 404 },
    );
  }

  return new Response(getImportExportTemplateCsv(template), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${template.filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
};
