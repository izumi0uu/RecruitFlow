import { Controller, Get } from "@nestjs/common";

import { getApiRuntimeConfig } from "@recruitflow/config";
import { createHealthResponse, type HealthResponse } from "@recruitflow/contracts";

@Controller("health")
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    const apiRuntimeConfig = getApiRuntimeConfig();

    return createHealthResponse({
      service: apiRuntimeConfig.serviceName,
    });
  }
}
