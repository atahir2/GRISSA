# SAQ Development Workflow

This guide explains how to extend the SAQ safely while preserving architectural boundaries.

## How to Continue Development Safely

1. Clarify whether the change is:
   - business logic (engine),
   - persistence/repository,
   - access control / auth / collaboration (`permissions.ts`, RLS, middleware),
   - or UI/report/export.
2. Implement in the correct layer first; avoid cross-layer shortcuts.
3. Reuse existing engine/repository APIs before adding new ones.
4. Validate impact across assessment flow, dashboard, and report.

## Where to Implement What

Layer definitions live in `docs/SAQ_ARCHITECTURE.md`; this section is intentionally execution-focused.

### Business logic

- Location: `src/lib/saq/engine/`
- Includes scoring, results derivation, action-plan derivation, interpretation logic.

### UI behavior and presentation

- Location: `src/components/saq/` and `src/app/saq/*`
- Includes layout, hierarchy, visual design, dashboard/report composition, PDF readability.
- PDF generation is implemented in `AssessmentReportPDF` via `@react-pdf/renderer` and should stay aligned with report hierarchy and engine outputs.

### Persistence and data access

- **Facade:** `src/lib/saq/assessment.repository.ts` (implementation chosen by `SAQ_DATABASE_PROVIDER`).
- **PostgreSQL (primary):** `src/lib/db/drizzle.ts`, `drizzle/schema.ts`, `drizzle/migrations/` — apply migrations with `npm run db:migrate` (host) or Compose service **`migrate`** (`drizzle-kit` is dev-only; the production **`app`** Docker image does not include it — see `docs/DOCKER.md`).
- **Supabase (legacy):** `src/lib/supabase/`, `supabase/migrations/` — RLS and client path when `SAQ_DATABASE_PROVIDER=supabase`; see `docs/SAQ_SUPABASE_SETUP.md`.
- Includes table writes/reads, row mapping, schema evolution, RLS (Supabase path), and listing/collaborator access as implemented per provider.

### Access control (auth and collaboration)

- **Not engine logic:** keep `src/lib/saq/engine/*` free of database clients and auth.
- **Roles and capabilities:** extend `src/lib/saq/permissions.ts` and enforce in `assessment.repository.ts`; add **RLS** when using the Supabase-hosted path.
- **UI:** use permission helpers and repository APIs; avoid scattering role string checks across components.
- **Routes:** `middleware.ts` for protected SAQ workflow paths; `src/app/auth/callback` for legacy Supabase OAuth/email `code` exchange when applicable; primary login is **NextAuth** (`/login`, `/signup`).

## Common Mistakes to Avoid

- Duplicating scoring/prioritization rules in UI components.
- Storing derived metrics/results in runtime tables.
- Moving static questionnaire content into the database.
- Mixing raw DB row types directly into UI contracts.
- Duplicating collaborator or role rules outside `permissions.ts` and the repository.
- Making report/export changes that alter business logic outputs.

## Updating Memory and Docs After Milestones

After significant feature or architecture changes:

1. Update the relevant `.cursor/rules/*.mdc` rule first (concise behavioral guidance).
2. Update human docs in `docs/` for narrative explanation and onboarding.
3. Keep `docs/SAQ_PROJECT_CONTEXT.md` as the broad quick-reference anchor.
4. Update `docs/SAQ_SUPABASE_SETUP.md` only when setup/schema procedures change.

## How to Use This Memory Layer

- **Primary Cursor memory**: `.cursor/rules/*.mdc`  
  Use these for concise, implementation-focused constraints during coding sessions.
- **Human reference layer**: `docs/*.md`  
  Use these for onboarding, architecture understanding, and deeper explanation.
- Prefer linking between docs/rules rather than duplicating long text blocks.
