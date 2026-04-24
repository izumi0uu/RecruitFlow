import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { getApiRuntimeConfig, loadRootEnv } from "@recruitflow/config";

import { AppModule } from "./app.module";

async function bootstrap() {
  loadRootEnv();
  const apiRuntimeConfig = getApiRuntimeConfig();
  const app = await NestFactory.create(AppModule, {
    logger: ["log", "warn", "error"],
    rawBody: true,
  });

  await app.listen(apiRuntimeConfig.port, apiRuntimeConfig.host);

  console.log(
    `[api] ${apiRuntimeConfig.serviceName} listening on http://${apiRuntimeConfig.host}:${apiRuntimeConfig.port}/health`,
  );
}

void bootstrap();
