import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./billing/billing.module";
import { CandidatesModule } from "./candidates/candidates.module";
import { ClientsModule } from "./clients/clients.module";
import { DocsModule } from "./docs/docs.module";
import { HealthModule } from "./health/health.module";
import { JobsModule } from "./jobs/jobs.module";
import { MembersModule } from "./members/members.module";
import { SubmissionsModule } from "./submissions/submissions.module";
import { WorkspaceModule } from "./workspace/workspace.module";

@Module({
  imports: [
    AuthModule,
    BillingModule,
    CandidatesModule,
    ClientsModule,
    DocsModule,
    HealthModule,
    JobsModule,
    MembersModule,
    SubmissionsModule,
    WorkspaceModule,
  ],
})
export class AppModule {}
