ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "archived_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "final_deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN IF NOT EXISTS "final_deleted_by_user_id" uuid;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notes" ADD CONSTRAINT "notes_archived_by_user_id_users_id_fk" FOREIGN KEY ("archived_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notes" ADD CONSTRAINT "notes_final_deleted_by_user_id_users_id_fk" FOREIGN KEY ("final_deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
