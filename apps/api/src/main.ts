import "reflect-metadata";

import { randomUUID } from "node:crypto";

import { NestFactory } from "@nestjs/core";

import { getApiRuntimeConfig, loadRootEnv } from "@recruitflow/config";

import { AppModule } from "./app.module";

type RequestWithHeaders = {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
  originalUrl?: string;
  requestId?: string;
  url?: string;
};

type ResponseWithFinish = {
  on(event: "finish", listener: () => void): void;
  setHeader(name: string, value: string): void;
  statusCode?: number;
};

type NextHandler = () => void;

function getRequestId(request: RequestWithHeaders) {
  const rawRequestId = request.headers["x-request-id"];
  const requestId = Array.isArray(rawRequestId) ? rawRequestId[0] : rawRequestId;

  return requestId?.trim() || randomUUID();
}

function requestObservabilityMiddleware(
  request: RequestWithHeaders,
  response: ResponseWithFinish,
  next: NextHandler,
) {
  const requestId = getRequestId(request);
  const startedAt = Date.now();

  request.requestId = requestId;
  response.setHeader("x-request-id", requestId);
  response.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const method = request.method ?? "UNKNOWN";
    const path = request.originalUrl ?? request.url ?? "unknown";
    const status = response.statusCode ?? 0;

    console.log(
      `[api] request_id=${requestId} method=${method} path=${path} status=${status} duration_ms=${durationMs}`,
    );
  });

  next();
}

async function bootstrap() {
  loadRootEnv();
  const apiRuntimeConfig = getApiRuntimeConfig();
  const app = await NestFactory.create(AppModule, {
    logger: ["log", "warn", "error"],
    rawBody: true,
  });

  app.use(requestObservabilityMiddleware);

  await app.listen(apiRuntimeConfig.port, apiRuntimeConfig.host);

  console.log(
    `[api] ${apiRuntimeConfig.serviceName} listening on http://${apiRuntimeConfig.host}:${apiRuntimeConfig.port}/health`,
  );
}

void bootstrap();
