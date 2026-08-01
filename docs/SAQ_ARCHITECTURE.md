# SAQ Technical Architecture

This document explains how the Sustainability Self-Assessment (SAQ) tool is structured for safe long-term evolution.

## Project Purpose

The SAQ supports research infrastructures, datacenters, and organizations in building a sustainability readiness baseline.  
It helps users assess capability, identify gaps, prioritize improvements, and produce actionable planning outputs (dashboard + report/PDF).

## Architecture Layers

### 1) Static questionnaire layer

- Source: `src/lib/saq/questionnaire.data.json`
- Accessed through: `src/lib/saq/questionnaire.repository.ts`
- Contains themes, scope items, questions, and answer options.
- This layer is configuration only and is **not stored in the runtime database**.

### 2) Runtime assessment layer

- Persisted in a **database** (see `SAQ_DATABASE_PROVIDER`):
  - **Postgres (default product direction):** Drizzle schema in `drizzle/schema.ts`, access via `src/lib/db/drizzle.ts` and `repositories/assessment.repository.postgres.ts`.
  - **Supabase (legacy/optional):** same logical tables, RLS, and `src/lib/supabase/*` clients when the provider is set to `supabase`.
- Tables (logical model): `profiles`, `assessments` (with `owner_user_id`), `assessment_collaborators`, `assessment_scope_selections`, `assessment_answers`, `assessment_action_items` (and related auth users linkage as per schema).
- **IO boundary:** `src/lib/saq/assessment.repository.ts` (facade) + `repositories/assessment.repository.*`.
- **Access rules:** `src/lib/saq/permissions.ts` + repository checks; **RLS** on the Supabase path. Not in the engine.

### 3) SAQ engine layer

- Location: `src/lib/saq/engine/`
- Key modules:
  - `scoring.ts` - scoring and priority helpers
  - `results.ts` - derived assessment summaries/results
  - `actions.ts` - action-plan derivation and implementation summaries
  - `interpretation.ts` - stakeholder-readable interpretation text
- Engine modules are pure and framework-agnostic.

### 4) Presentation layer

- Assessment flow UI: `src/app/saq/assessment/` + `src/components/saq/`
- Dashboard UI: `src/app/saq/dashboard/`
- Report/export UI: `src/app/saq/report/`
- The report route computes engine-derived data and uses `AssessmentReportPDF` to generate the PDF output.

## Core Data Flow

1. Authenticate (**NextAuth** session for credentials flows; middleware protects `/saq/assessment/*`, `/saq/dashboard/*`, `/saq/report/*`).
2. Load questionnaire config from static JSON.
3. Load runtime assessment data via repository (**Postgres or Supabase** per `SAQ_DATABASE_PROVIDER`), respecting ownership and collaborator access.
4. Compute derived outputs in memory through engine modules.
5. Render assessment/dashboard/report views from those outputs.
6. Persist only runtime edits (scope/answers/action metadata), not derived results.

## Persistence Model and Boundaries

- **Persisted**: runtime state required to reconstruct an assessment.
- **Not persisted**: derived summaries, priorities, and interpretation outputs.
- UI must not bypass repositories for direct DB access.
- UI must not duplicate engine formulas or priority logic.

## Folder Structure (Practical View)

- `src/lib/saq/` - domain types, repositories, engine, `permissions.ts`
- `src/lib/auth/` - NextAuth options, safe redirects, error formatting
- `src/lib/db/` - Drizzle + `pg` pool for PostgreSQL mode
- `drizzle/` - `schema.ts`, `migrations/`
- `src/lib/supabase/` - Supabase client (legacy provider path)
- `src/components/saq/` - SAQ feature components
- `src/components/auth/` - login/signup UI
- `src/app/saq/` - route entry points (Home `/saq`, Workspace `/saq/manage`, assessment, dashboard, report)
- `src/app/login/`, `src/app/signup/`, `src/app/auth/` - authentication routes
- `middleware.ts` - session refresh and route protection for workflow routes
- `drizzle/migrations/` - Drizzle SQL migrations (Postgres)
- `supabase/migrations/` - Supabase SQL migrations (legacy host)
- `docs/` - human reference docs
- `.cursor/rules/` - Cursor-native rule memory

For implementation process and update habits, see `docs/SAQ_DEVELOPMENT_WORKFLOW.md` (this file stays architecture-focused).

## Dashboard, Report, and Export Relationship

- Dashboard and report reuse the same engine outputs for consistency.
- **Shared SAQ UI shell:** `app/saq/layout.tsx` (nav + dark page canvas) and `GrissaPageHeader` page titles; dashboard/report use contextual **info banners** and light cards for metrics.
- Report emphasizes print/PDF readability and stakeholder communication.
- Export pipeline uses `@react-pdf/renderer` (`AssessmentReportPDF`) and must not alter engine or persistence logic.
