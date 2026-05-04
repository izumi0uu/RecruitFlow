import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from "@nestjs/common";

import {
  documentDownloadQuerySchema,
  documentMutationRequestSchema,
  documentParamsSchema,
  documentsExportQuerySchema,
  documentsListQuerySchema,
  type DocumentMutationResponse,
  type DocumentsListResponse,
} from "@recruitflow/contracts";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentWorkspaceContext } from "../workspace/current-workspace-context.decorator";
import { RequireWorkspaceRole } from "../workspace/require-workspace-role.decorator";
import type { ApiWorkspaceContext } from "../workspace/workspace.service";
import { WorkspaceContextGuard } from "../workspace/workspace.guard";
import { WorkspaceRoleGuard } from "../workspace/workspace-role.guard";

import { DocumentsService } from "./documents.service";

type HeaderWriter = {
  setHeader: (name: string, value: string) => void;
};

@Controller("documents")
@UseGuards(AuthGuard, WorkspaceContextGuard, WorkspaceRoleGuard)
@RequireWorkspaceRole({ minRole: "coordinator" })
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get("export")
  async exportDocuments(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Query() query: unknown,
    @Res({ passthrough: true }) response: HeaderWriter,
  ): Promise<StreamableFile> {
    const parsedQuery = documentsExportQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      throw new BadRequestException(
        parsedQuery.error.issues[0]?.message ??
          "Invalid documents export query",
      );
    }

    const exportResult = await this.documentsService.exportDocuments(
      context,
      parsedQuery.data,
    );

    response.setHeader("cache-control", exportResult.cacheControl);
    response.setHeader(
      "content-disposition",
      exportResult.contentDisposition,
    );
    response.setHeader("content-type", exportResult.contentType);

    return new StreamableFile(exportResult.body);
  }

  @Get(":documentId/download")
  async downloadDocument(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Param() params: unknown,
    @Query() query: unknown,
    @Res({ passthrough: true }) response: HeaderWriter,
  ): Promise<StreamableFile> {
    const parsedParams = documentParamsSchema.safeParse(params);
    const parsedQuery = documentDownloadQuerySchema.safeParse(query);

    if (!parsedParams.success) {
      throw new BadRequestException(
        parsedParams.error.issues[0]?.message ?? "Invalid document id",
      );
    }

    if (!parsedQuery.success) {
      throw new BadRequestException(
        parsedQuery.error.issues[0]?.message ??
          "Invalid document download query",
      );
    }

    const downloadResult = await this.documentsService.downloadDocument(
      context,
      parsedParams.data,
      parsedQuery.data,
    );

    response.setHeader("cache-control", downloadResult.cacheControl);
    response.setHeader(
      "content-disposition",
      downloadResult.contentDisposition,
    );
    response.setHeader("content-type", downloadResult.contentType);

    return new StreamableFile(downloadResult.body);
  }

  @Get()
  getDocuments(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Query() query: unknown,
  ): Promise<DocumentsListResponse> {
    const parsedQuery = documentsListQuerySchema.safeParse(query);

    if (!parsedQuery.success) {
      throw new BadRequestException(
        parsedQuery.error.issues[0]?.message ?? "Invalid documents query",
      );
    }

    return this.documentsService.listDocuments(context, parsedQuery.data);
  }

  @Post()
  createDocument(
    @CurrentWorkspaceContext() context: ApiWorkspaceContext,
    @Body() body: unknown,
  ): Promise<DocumentMutationResponse> {
    const parsedBody = documentMutationRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      throw new BadRequestException(
        parsedBody.error.issues[0]?.message ?? "Invalid document payload",
      );
    }

    return this.documentsService.createDocument(context, parsedBody.data);
  }
}
