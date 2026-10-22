CREATE TYPE "public"."action_effort_required" AS ENUM('Low', 'Medium', 'High');--> statement-breakpoint
CREATE TYPE "public"."action_status" AS ENUM('Planned', 'In Progress', 'Completed');--> statement-breakpoint
CREATE TYPE "public"."assessment_version_status" AS ENUM('draft', 'submitted', 'reviewed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."assessment_role" AS ENUM('owner', 'editor', 'reviewer', 'viewer');--> statement-breakpoint
CREATE TABLE "assessment_action_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"effort_required" "action_effort_required",
	"leader" text,
	"deadline" date,
	"status" "action_status",
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"selected_score" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_answers_selected_score_check" CHECK ("assessment_answers"."selected_score" in (1, 2, 3))
);
--> statement-breakpoint
CREATE TABLE "assessment_collaborators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "assessment_role" NOT NULL,
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_scope_selections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"version_id" uuid NOT NULL,
	"scope_id" text NOT NULL,
	"in_scope" boolean DEFAULT false NOT NULL,
	"target_capability" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_scope_selections_target_capability_check" CHECK ("assessment_scope_selections"."target_capability" in (1, 2, 3))
);
--> statement-breakpoint
CREATE TABLE "assessment_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"label" text,
	"status" "assessment_version_status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_name" text NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"full_name" text,
	"organisation_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_action_items" ADD CONSTRAINT "assessment_action_items_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_action_items" ADD CONSTRAINT "assessment_action_items_version_id_assessment_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."assessment_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_version_id_assessment_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."assessment_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_collaborators" ADD CONSTRAINT "assessment_collaborators_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_scope_selections" ADD CONSTRAINT "assessment_scope_selections_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_scope_selections" ADD CONSTRAINT "assessment_scope_selections_version_id_assessment_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."assessment_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_versions" ADD CONSTRAINT "assessment_versions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_assessment_action_items_assessment_id" ON "assessment_action_items" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "idx_assessment_action_items_version_id" ON "assessment_action_items" USING btree ("version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_action_items_version_question" ON "assessment_action_items" USING btree ("version_id","question_id");--> statement-breakpoint
CREATE INDEX "idx_assessment_answers_assessment_id" ON "assessment_answers" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "idx_assessment_answers_version_id" ON "assessment_answers" USING btree ("version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_answers_version_question" ON "assessment_answers" USING btree ("version_id","question_id");--> statement-breakpoint
CREATE INDEX "idx_assessment_collaborators_assessment_id" ON "assessment_collaborators" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "idx_assessment_collaborators_user_id" ON "assessment_collaborators" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_assessment_collaborators_assessment_user" ON "assessment_collaborators" USING btree ("assessment_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_assessment_scope_selections_assessment_id" ON "assessment_scope_selections" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "idx_assessment_scope_selections_version_id" ON "assessment_scope_selections" USING btree ("version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_scope_selections_version_scope" ON "assessment_scope_selections" USING btree ("version_id","scope_id");--> statement-breakpoint
CREATE INDEX "idx_assessment_versions_assessment_id" ON "assessment_versions" USING btree ("assessment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_assessment_versions_assessment_number" ON "assessment_versions" USING btree ("assessment_id","version_number");--> statement-breakpoint
CREATE INDEX "idx_assessments_owner_user_id" ON "assessments" USING btree ("owner_user_id");