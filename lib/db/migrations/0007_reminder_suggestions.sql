CREATE TYPE "public"."reminder_suggestion_status" AS ENUM('suggested', 'accepted', 'dismissed');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reminder_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"automation_run_id" uuid NOT NULL,
	"source_entity_type" varchar(50) NOT NULL,
	"source_entity_id" uuid NOT NULL,
	"reason" varchar(80) NOT NULL,
	"proposed_title" varchar(180) NOT NULL,
	"proposed_due_at" timestamp,
	"proposed_assignee_user_id" uuid,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"status" "reminder_suggestion_status" DEFAULT 'suggested' NOT NULL,
	"accepted_task_id" uuid,
	"dismiss_reason" varchar(80),
	"dismiss_note" text,
	"dedupe_key" varchar(255) NOT NULL,
	"source_snapshot_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reminder_suggestions" ADD CONSTRAINT "reminder_suggestions_workspace_id_teams_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reminder_suggestions" ADD CONSTRAINT "reminder_suggestions_automation_run_id_automation_runs_id_fk" FOREIGN KEY ("automation_run_id") REFERENCES "public"."automation_runs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reminder_suggestions" ADD CONSTRAINT "reminder_suggestions_proposed_assignee_user_id_users_id_fk" FOREIGN KEY ("proposed_assignee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reminder_suggestions" ADD CONSTRAINT "reminder_suggestions_accepted_task_id_tasks_id_fk" FOREIGN KEY ("accepted_task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reminder_suggestions_workspace_dedupe_unique" ON "reminder_suggestions" ("workspace_id","dedupe_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reminder_suggestions_workspace_status_created_at_idx" ON "reminder_suggestions" ("workspace_id","status","created_at");
