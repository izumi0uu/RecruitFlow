ALTER TABLE "notes" DROP CONSTRAINT IF EXISTS "notes_final_deleted_by_user_id_users_id_fk";--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN IF EXISTS "final_deleted_at";--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN IF EXISTS "final_deleted_by_user_id";
