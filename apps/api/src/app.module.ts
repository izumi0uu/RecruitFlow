import { Module } from "@nestjs/common";

import { ActivityModule } from "./activity/activity.module";
import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./billing/billing.module";
import { CandidatesModule } from "./candidates/candidates.module";
import { ClientsModule } from "./clients/clients.module";
import { DocsModule } from "./docs/docs.module";
import { DocumentsModule } from "./documents/documents.module";
import { HealthModule } from "./health/health.module";
import { JobsModule } from "./jobs/jobs.module";
import { MembersModule } from "./members/members.module";
import { SubmissionsModule } from "./submissions/submissions.module";
import { TasksModule } from "./tasks/tasks.module";
import { WorkspaceModule } from "./workspace/workspace.module";

@Module({
  imports: [
    ActivityModule,
    AuthModule,
    BillingModule,
    CandidatesModule,
    ClientsModule,
    DocsModule,
    DocumentsModule,
    HealthModule,
    JobsModule,
    MembersModule,
    SubmissionsModule,
    TasksModule,
    WorkspaceModule,
  ],
})
export class AppModule {}
