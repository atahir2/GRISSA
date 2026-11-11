CREATE TABLE "assessment_question_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "assessment_id" uuid NOT NULL,
  "version_id" uuid NOT NULL,
  "question_id" text NOT NULL,
  "notes" text DEFAULT '' NOT NULL,
  "present_keys" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "assessment_question_evidence_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "assessment_question_evidence_version_id_assessment_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."assessment_versions"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_question_evidence_version_question" ON "assessment_question_evidence" USING btree ("version_id","question_id");
--> statement-breakpoint
CREATE INDEX "idx_assessment_question_evidence_version_id" ON "assessment_question_evidence" USING btree ("version_id");
--> statement-breakpoint
CREATE TABLE "assessment_evidence_files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "assessment_id" uuid NOT NULL,
  "version_id" uuid NOT NULL,
  "question_id" text NOT NULL,
  "original_name" text NOT NULL,
  "stored_name" text NOT NULL,
  "content_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "assessment_evidence_files_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "assessment_evidence_files_version_id_assessment_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."assessment_versions"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "idx_assessment_evidence_files_version_id" ON "assessment_evidence_files" USING btree ("version_id");
