# SAQ Technical Architecture

How the Sustainability Self-Assessment (SAQ / GRISSA) tool is structured for safe long-term evolution. Product purpose and onboarding: `docs/SAQ_PROJECT_CONTEXT.md`. Implementation habits: `docs/SAQ_DEVELOPMENT_WORKFLOW.md`.

## Architecture Layers

### 1) Static questionnaire layer

- Source: `src/lib/saq/questionnaire.data.json`
- Access: `src/lib/saq/questionnaire.repository.ts`
- Themes, scope items, questions, answer options (capability scores 1–3)
- **Not stored** in the runtime database

### 2) Runtime assessment layer

Selected by **`SAQ_DATABASE_PROVIDER`**:

| Value | Implementation |
|-------|----------------|
| `postgres` (recommended) | Drizzle schema `drizzle/schema.ts`, pool `src/lib/db/drizzle.ts`, `repositories/assessment.repository.postgres.ts` |
| `supabase` (legacy) | `src/lib/supabase/*`, `repositories/assessment.repository.supabase.ts`, RLS in `supabase/migrations/` |
| unset | Selector defaults to **`supabase`** — set `postgres` explicitly for new deploys |

**Logical tables:** `profiles` (optional display fields), Auth.js `users` / sessions (Postgres path), `assessments` (`owner_user_id`), `assessment_versions`, `assessment_collaborators`, `assessment_scope_selections`, `assessment_answers`, `assessment_action_items`.

Scope, answers, and action metadata are keyed by **`version_id`**. Version statuses: `draft` | `submitted` | `reviewed` | `archived`. Content edits require edit role **and** draft status (`canEditAssessmentVersionContent` in `permissions.ts`).

**IO boundary:**

- UI imports `src/lib/saq/assessment.repository.ts` (client facade).
- Facade calls **`POST /api/saq/repository`** via `appFetch` (`src/lib/base-path.ts`).
- Route dispatches to `getAssessmentRuntimeRepository()` (`assessment.repository.selector.ts`).
- Domain types: `src/lib/saq/assessment.types.ts`. Access helpers: `src/lib/saq/permissions.ts`.

### 3) SAQ engine layer

Location: `src/lib/saq/engine/`

| Module | Role |
|--------|------|
| `scoring.ts` | Scoring and priority helpers/types |
| `results.ts` | Assessment results / summaries from scope + answers |
| `actions.ts` | Action-plan items and implementation summaries |
| `interpretation.ts` | Stakeholder-readable interpretation text |
| `scope.ts` | In-scope maps and related helpers |

Pure TypeScript: no React, no DB, no auth.

### 4) Presentation layer

- Assessment flow: `src/app/saq/assessment/` + `src/components/saq/`
- Workspace / management: `src/app/saq/manage/` (`SaqLanding`, `AssessmentManagementWorkspace`)
- Dashboard: `src/app/saq/dashboard/`
- Report/PDF: `src/app/saq/report/` + `AssessmentReportPDF` (`@react-pdf/renderer`)
- Shared shell: `src/app/saq/layout.tsx` (`SaqAuthenticatedHeader`, dark canvas, `BetaBanner`)

## Core Data Flow

1. Authenticate (**NextAuth** JWT). `src/middleware.ts` protects `/saq/assessment/*`, `/saq/dashboard/*`, `/saq/report/*`. If `NEXT_PUBLIC_SUPABASE_*` are set, middleware may refresh Supabase cookies but does **not** replace the NextAuth gate.
2. Resolve active **assessment version** (`useAssessmentVersionRoute` / `?versionId=`).
3. Load questionnaire JSON + version-scoped runtime data via repository facade.
4. Compute derived outputs in memory through engine modules.
5. Render assessment / dashboard / report from those outputs.
6. Persist only runtime edits (scope / answers / action metadata), never derived results.

## Persistence Boundaries

- **Persisted:** identity/access and runtime assessment state (including versions).
- **Not persisted:** scores, summaries, priorities, recommendations, interpretation text.
- UI must not bypass the repository facade for direct DB access.
- UI must not duplicate engine formulas.

## Auth and Collaboration

- **Primary auth:** NextAuth credentials — `src/lib/auth/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/api/auth/register/route.ts`.
- **Client session:** `AuthSessionProvider` sets `SessionProvider` `basePath={withBasePath("/api/auth")}` so NextAuth works under Next.js `basePath`.
- **Roles:** `owner` | `editor` | `reviewer` | `viewer` — single source of truth in `permissions.ts`; repository enforces access.
- **Legacy:** `/auth/callback` may exchange Supabase `?code=` when that path is enabled.

## Folder Structure (practical)

```
src/lib/saq/          domain types, permissions, questionnaire, engine, repositories, facade
src/lib/auth/         NextAuth options, safe redirects, error formatting
src/lib/db/           Drizzle + pg pool
src/lib/supabase/     legacy Supabase clients (provider = supabase)
src/lib/base-path.ts  withBasePath, appFetch, assetUrl
src/components/saq/   feature UI
src/components/auth/  login/signup + AuthSessionProvider
src/app/saq/          Home, manage, assessment, dashboard, report
src/app/api/          nextauth, register, saq/repository
src/middleware.ts     NextAuth JWT gate (+ optional Supabase cookie refresh)
drizzle/              schema.ts, migrations/
supabase/migrations/  legacy host SQL
docs/                 human reference
.cursor/rules/        Cursor rule memory
```

## Dashboard, Report, and Export

- Dashboard and report reuse the same engine outputs.
- Shared shell: dark canvas + light content cards; `GrissaPageHeader` / info banners.
- PDF is presentation-only via `AssessmentReportPDF`; it must not change engine or persistence logic.

## Related Ops Docs

- Local/prod-like Compose: `docs/DOCKER.md`
- Legacy Supabase project setup: `docs/SAQ_SUPABASE_SETUP.md`
- Postgres migration status: `docs/SAQ_SUPABASE_TO_POSTGRES_MIGRATION.md`
