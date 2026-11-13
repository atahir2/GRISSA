ALTER TABLE "assessment_collaborators" ADD COLUMN "version_id" uuid;
--> statement-breakpoint
ALTER TABLE "assessment_collaborators" ADD CONSTRAINT "assessment_collaborators_version_id_assessment_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."assessment_versions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
DROP INDEX "uq_assessment_collaborators_assessment_user";
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_assessment_collaborators_all_versions" ON "assessment_collaborators" ("assessment_id", "user_id") WHERE "version_id" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_assessment_collaborators_one_version" ON "assessment_collaborators" ("assessment_id", "user_id", "version_id") WHERE "version_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "idx_assessment_collaborators_version_id" ON "assessment_collaborators" ("version_id");
