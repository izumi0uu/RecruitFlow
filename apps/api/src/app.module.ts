import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./billing/billing.module";
import { HealthModule } from "./health/health.module";
import { MembersModule } from "./members/members.module";
import { WorkspaceModule } from "./workspace/workspace.module";

@Module({
  imports: [AuthModule, BillingModule, HealthModule, MembersModule, WorkspaceModule],
})
export class AppModule {}
