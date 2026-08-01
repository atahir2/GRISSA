# SAQ Supabase to PostgreSQL Migration Audit

Date: 2026-04-30  
Branch context: `migration/postgres-decoupling`  
Scope: audit and documentation only (no refactor)

## Objective

Audit current Supabase dependency in the SAQ codebase and define a safe migration path toward plain PostgreSQL, while preserving the current Supabase implementation as the default backend.

## Evidence Base

Primary evidence:
- `supabase-audit.txt`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/middleware.ts`
- `src/lib/saq/assessment.repository.ts`
- `src/lib/saq/createAssessmentAction.ts`
- `middleware.ts`
- `src/app/auth/callback/route.ts`
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/SignupForm.tsx`
- `src/components/saq/SaqLanding.tsx`
- `env.example`
- `next.config.js`
- `package.json`
- `supabase/migrations/*.sql`

## Current Supabase Touchpoints

### 1) Supabase client and SSR integration

- `src/lib/supabase/client.ts`
  - Uses `@supabase/ssr` `createBrowserClient`.
  - Reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `src/lib/supabase/server.ts`
  - Uses `@supabase/ssr` `createServerClient`.
  - Cookie bridge via `next/headers` for server-side auth session continuity.
- `src/lib/supabase/middleware.ts`
  - Uses `createServerClient` in middleware context.
  - Handles request/response cookie synchronization for session refresh.

### 2) SAQ repository (runtime persistence + access checks)

- `src/lib/saq/assessment.repository.ts`
  - Core persistence currently uses Supabase query builder (`from`, `select`, `insert`, `update`, `delete`, `upsert`) and RPC (`rpc`).
  - Database objects used:
    - Tables: `assessments`, `assessment_versions`, `assessment_scope_selections`, `assessment_answers`, `assessment_action_items`, `assessment_collaborators`
    - RPCs: `list_my_assessments`, `list_assessment_collaborators`, `add_assessment_collaborator_by_email`
  - Session/user resolution tied to Supabase Auth APIs:
    - `supabase.auth.getUser()`
    - `supabase.auth.getSession()`

### 3) Auth and session logic

- `src/components/auth/LoginForm.tsx`
  - `getSession`, `signInWithPassword`.
- `src/components/auth/SignupForm.tsx`
  - `getSession`, `signUp`, email redirect behavior linked to Supabase Auth.
- `src/components/saq/SaqLanding.tsx`
  - `getSession`, `onAuthStateChange`, `exchangeCodeForSession`, `signOut`.
  - Imports `Session` type from `@supabase/supabase-js`.
- `src/app/auth/callback/route.ts`
  - Exchanges auth code with `supabase.auth.exchangeCodeForSession`.
- `src/lib/auth/auth-errors.ts`
  - Error message text explicitly references Supabase free-tier limits.
- `src/lib/auth/site-url.ts`, `env.example`, `next.config.js`
  - Redirect URL behavior documented around Supabase email/OAuth flows and base path concerns.

### 4) Route protection and session refresh

- `middleware.ts`
  - Auth gate for `/saq/assessment`, `/saq/dashboard`, `/saq/report`.
  - Depends on middleware Supabase client + `supabase.auth.getUser()`.
  - Also refreshes cookies globally to keep PostgREST JWT/RLS behavior stable.

### 5) App routes and component-level coupling

- Direct Supabase in app routes:
  - `src/app/auth/callback/route.ts`.
- Indirect Supabase coupling (via repository/server action):
  - `src/components/saq/AssessmentLayout.tsx`
  - `src/components/saq/AssessmentDashboard.tsx`
  - `src/components/saq/AssessmentReport.tsx`
  - `src/components/saq/AssessmentCollaboratorsPanel.tsx`
  - `src/components/saq/AssessmentVersionsPanel.tsx`
  - `src/components/saq/useAssessmentVersionRoute.ts`
  - Through: `assessment.repository.ts` and `createAssessmentAction.ts`.

### 6) Migrations and SQL security model

Supabase SQL migration track includes:
- Schema runtime tables and triggers:
  - `20250310000000_create_saq_runtime_tables.sql`
  - `20250404140000_assessment_versions.sql`
- Auth-linked schema:
  - `profiles` references `auth.users`
  - ownership/collaborator rows reference `auth.users`
- RLS policy layers:
  - `20250310100000_saq_rls_policies.sql`
  - `20250401120000_auth_profiles_owner_rls.sql`
  - `20250402120000_assessment_collaborators.sql`
  - `20250403130000_fix_rls_recursion_collaborators.sql`
  - `20250405120000_assure_assessment_insert_policy.sql`
- SECURITY DEFINER and RPC functions:
  - `list_my_assessments`
  - `list_assessment_collaborators`
  - `add_assessment_collaborator_by_email`
  - `create_assessment_bundle` (`20250406120000_create_assessment_bundle_rpc.sql`)

## Dependency Classification

### Database access

- Supabase query API in `assessment.repository.ts` for all SAQ runtime CRUD and upserts.
- Supabase RPC usage in:
  - `assessment.repository.ts`
  - `createAssessmentAction.ts`
- Supabase type dependency:
  - `src/lib/supabase/database.types.ts`

### Authentication and session

- Browser auth methods (`signInWithPassword`, `signUp`, `signOut`, `getSession`, auth listeners).
- Server auth methods (`getUser`, `exchangeCodeForSession`, `setSession`).
- Session cookie plumbing in middleware and server client wrappers.

### RLS and security

- Heavy reliance on Postgres RLS with `auth.uid()` expectations.
- Tight coupling to Supabase Auth schema/roles:
  - `auth.users`
  - `authenticated`, `anon` roles
- SECURITY DEFINER helper functions and RPCs used to avoid policy recursion and support cross-table security checks.

### Environment configuration

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.
- Base-path-aware auth redirect behavior maintained for Supabase callback/email links.
- `@supabase/ssr` dependency in `package.json`.

### UI coupling

- Direct UI coupling:
  - `LoginForm`, `SignupForm`, `SaqLanding` call Supabase auth APIs directly.
- Indirect UI coupling:
  - Most SAQ UI depends on repository/server actions that are Supabase-backed today.

## What Moves Easily to Plain PostgreSQL

1. SAQ domain model and engine
   - Questionnaire data and SAQ engine are already backend-agnostic:
     - `src/lib/saq/questionnaire.data.json`
     - `src/lib/saq/engine/*`
2. Core table structures
   - `assessments`, `assessment_versions`, `assessment_scope_selections`, `assessment_answers`, `assessment_action_items`, `assessment_collaborators` can be represented directly in plain PostgreSQL.
3. CRUD semantics
   - Most repository table operations (`select/insert/update/delete/upsert`) translate cleanly to ORM/query-builder calls.
4. Permission intent model
   - Business rules in `src/lib/saq/permissions.ts` can remain as domain logic and be reused.

## What Needs Redesign

1. Auth integration
   - Current flow is Supabase Auth-native (session APIs, code exchange, browser listeners, `auth.users` linkage).
   - A replacement identity/session provider is required before full decoupling.
2. RLS model dependency on Supabase Auth context
   - Policies rely on `auth.uid()` and Supabase roles; plain PostgreSQL deployment must provide equivalent user context propagation or move checks into app-layer authorization.
3. Supabase RPC usage
   - RPC functions are operationally central and permission-aware.
   - Need equivalent implementation:
     - SQL functions retained and called via driver/ORM, or
     - Moved to application service layer.
4. Middleware/session refresh assumptions
   - Middleware behavior currently tied to Supabase cookie refresh mechanics.
   - Must be redesigned with whichever auth/session framework replaces or complements Supabase Auth.

## ORM Recommendation: Drizzle (Preferred)

Recommendation: **Drizzle** for this migration phase.

Justification:
- Lower abstraction overhead for a staged migration where SQL/RLS/RPC behavior is already explicit and important.
- Better fit for incremental dual-backend adaptation (Supabase default + Postgres adapter) with minimal disruption.
- Keeps SQL-first control for advanced constructs (policies, functions, custom migrations) that are central in this codebase.
- Type-safe enough for repository replacement while preserving close-to-SQL semantics.

When Prisma may still be preferred:
- If team priority shifts toward rapid CRUD development on conventional relational models and less direct SQL control.

Current constraints (RLS helpers, SECURITY DEFINER functions, auth-context-sensitive behavior) favor Drizzle’s SQL-near approach.

## Safe Staged Migration Plan (No Immediate Backend Switch)

### Stage 0 - Documentation and contracts (current stage)

- Freeze and document Supabase touchpoints (this document).
- Define backend abstraction contracts only:
  - `AssessmentRepository` interface
  - `AuthSessionProvider` interface
  - `AccessControlProvider` interface
- Keep current Supabase implementation as default.

### Stage 1 - Abstraction layer introduction (no behavior change)

- Add adapter interfaces under `src/lib/saq/` and `src/lib/auth/`.
- Wrap existing Supabase implementations behind these interfaces.
- Keep all existing routes/components behavior identical.
- Introduce backend selection flag:
  - e.g. `SAQ_BACKEND=supabase|postgres`, default `supabase`.

### Stage 2 - PostgreSQL adapter skeleton

- Add Postgres connection and Drizzle schema definitions.
- Implement read-only parity first for non-mutating repository calls.
- Keep write paths on Supabase.
- Add parity tests comparing Supabase and Postgres adapter outputs for selected assessment fixtures.

### Stage 3 - Incremental write migration by capability

- Migrate write operations in safe order:
  1. `saveScopeSelections`
  2. `saveAnswers`
  3. `saveActionMetadata`
  4. version creation/copy logic
  5. collaborator operations
- Preserve Supabase path as fallback for each capability flag.

### Stage 4 - Auth/session decoupling preparation

- Isolate Supabase auth calls from UI into a dedicated auth service facade.
- Introduce alternative session strategy (e.g. NextAuth/Auth.js with PostgreSQL store) behind `AuthSessionProvider`.
- Maintain backward-compatible middleware until parity is proven.

### Stage 5 - Security model migration

- Rebuild equivalent authorization model for plain PostgreSQL:
  - Either session-aware RLS context setting + SQL policies
  - Or app-layer authorization + reduced RLS surface
- Port critical SQL functions/RPC semantics where still needed.
- Run security regression tests (owner/editor/reviewer/viewer matrix).

### Stage 6 - Controlled cutover

- Enable Postgres backend in non-production environment first.
- Verify functional parity and data consistency.
- Keep Supabase backend runnable as immediate rollback target.

## Risks

1. Auth-context loss in SQL policies
   - If `auth.uid()` semantics are removed without replacement, access control can fail open or fail closed.
2. Behavioral drift in RPC replacement
   - Rewriting `create_assessment_bundle` and collaborator RPC logic in app code can introduce transactional/security differences.
3. UI/session race differences
   - Replacing Supabase auth listeners/callback behavior may affect redirect/session timing.
4. Data consistency during dual-write or phased writes
   - Partial migration can create drift if fallback and primary writes diverge.
5. Migration complexity around collaborator and versioning policies
   - Current model uses layered helpers and recursion-safe patterns; easy to regress.

## Rollback Notes

- Keep `SAQ_BACKEND=supabase` as default until full parity and sign-off.
- During incremental stages, introduce per-feature flags so rollback can be targeted (not all-or-nothing).
- Do not remove existing Supabase SQL migrations/functions until:
  - Postgres path passes parity tests
  - Security matrix tests pass
  - User acceptance on assessment creation, versioning, collaboration, dashboard/report flows passes
- Maintain a rollback runbook:
  1. flip backend env flag back to `supabase`
  2. clear app cache/build artifacts
  3. verify middleware auth-protected routes and assessment CRUD paths

## Immediate Next Deliverables (still non-breaking)

1. Add backend interface definitions (no caller behavior changes).
2. Add Supabase adapter implementation conforming to those interfaces.
3. Add backend factory with default-to-Supabase selection.
4. Add test scaffolding for adapter parity on representative SAQ assessment fixtures.

