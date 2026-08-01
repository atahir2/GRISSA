import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const collaboratorRoleEnum = pgEnum("assessment_role", [
  "owner",
  "editor",
  "reviewer",
  "viewer",
]);

export const assessmentVersionStatusEnum = pgEnum("assessment_version_status", [
  "draft",
  "submitted",
  "reviewed",
  "archived",
]);

export const actionEffortEnum = pgEnum("action_effort_required", ["Low", "Medium", "High"]);

export const actionStatusEnum = pgEnum("action_status", [
  "Planned",
  "In Progress",
  "Completed",
]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  fullName: text("full_name"),
  organisationName: text("organisation_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: text("image"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (table) => ({
    accountProviderUnique: uniqueIndex("uq_accounts_provider_account_id").on(
      table.provider,
      table.providerAccountId
    ),
  })
);

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => ({
    sessionsUserIdx: index("idx_sessions_user_id").on(table.userId),
  })
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => ({
    compositePk: primaryKey({ columns: [table.identifier, table.token] }),
  })
);

export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organisationName: text("organisation_name").notNull(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIdx: index("idx_assessments_owner_user_id").on(table.ownerUserId),
  })
);

export const assessmentVersions = pgTable(
  "assessment_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    label: text("label"),
    status: assessmentVersionStatusEnum("status").notNull().default("draft"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    assessmentIdx: index("idx_assessment_versions_assessment_id").on(table.assessmentId),
    versionUnique: uniqueIndex("uq_assessment_versions_assessment_number").on(
      table.assessmentId,
      table.versionNumber
    ),
  })
);

export const assessmentCollaborators = pgTable(
  "assessment_collaborators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: collaboratorRoleEnum("role").notNull(),
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    assessmentIdx: index("idx_assessment_collaborators_assessment_id").on(table.assessmentId),
    userIdx: index("idx_assessment_collaborators_user_id").on(table.userId),
    assessmentUserUnique: uniqueIndex("uq_assessment_collaborators_assessment_user").on(
      table.assessmentId,
      table.userId
    ),
  })
);

export const assessmentScopeSelections = pgTable(
  "assessment_scope_selections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    versionId: uuid("version_id")
      .notNull()
      .references(() => assessmentVersions.id, { onDelete: "cascade" }),
    scopeId: text("scope_id").notNull(),
    inScope: boolean("in_scope").notNull().default(false),
    targetCapability: integer("target_capability"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    assessmentIdx: index("idx_assessment_scope_selections_assessment_id").on(table.assessmentId),
    versionIdx: index("idx_assessment_scope_selections_version_id").on(table.versionId),
    versionScopeUnique: uniqueIndex("uq_scope_selections_version_scope").on(
      table.versionId,
      table.scopeId
    ),
    targetCapabilityCheck: check(
      "assessment_scope_selections_target_capability_check",
      sql`${table.targetCapability} in (1, 2, 3)`
    ),
  })
);

export const assessmentAnswers = pgTable(
  "assessment_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    versionId: uuid("version_id")
      .notNull()
      .references(() => assessmentVersions.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    selectedScore: integer("selected_score"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    assessmentIdx: index("idx_assessment_answers_assessment_id").on(table.assessmentId),
    versionIdx: index("idx_assessment_answers_version_id").on(table.versionId),
    versionQuestionUnique: uniqueIndex("uq_answers_version_question").on(
      table.versionId,
      table.questionId
    ),
    selectedScoreCheck: check(
      "assessment_answers_selected_score_check",
      sql`${table.selectedScore} in (1, 2, 3)`
    ),
  })
);

export const assessmentActionItems = pgTable(
  "assessment_action_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    versionId: uuid("version_id")
      .notNull()
      .references(() => assessmentVersions.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull(),
    effortRequired: actionEffortEnum("effort_required"),
    leader: text("leader"),
    deadline: date("deadline"),
    status: actionStatusEnum("status"),
    remarks: text("remarks"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    assessmentIdx: index("idx_assessment_action_items_assessment_id").on(table.assessmentId),
    versionIdx: index("idx_assessment_action_items_version_id").on(table.versionId),
    versionQuestionUnique: uniqueIndex("uq_action_items_version_question").on(
      table.versionId,
      table.questionId
    ),
  })
);

