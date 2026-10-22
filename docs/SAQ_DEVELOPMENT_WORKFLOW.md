# SAQ Development Workflow

How to extend the SAQ safely while preserving architectural boundaries. Layer definitions: `docs/SAQ_ARCHITECTURE.md`. Product orientation: `docs/SAQ_PROJECT_CONTEXT.md`.

## How to Continue Development Safely

1. Clarify whether the change is:
   - business logic (engine),
   - persistence / repository,
   - access control / auth / collaboration / versions (`permissions.ts`, middleware, RLS),
   - or UI / report / export.
2. Implement in the correct layer first; avoid cross-layer shortcuts.
3. Reuse existing engine and repository APIs before adding new ones.
4. Validate impact across assessment flow, dashboard, and report (including version query params).

## Where to Implement What

### Business logic

- Location: `src/lib/saq/engine/`
- Scoring, results, action-plan derivation, interpretation.
- Keep free of DB clients, NextAuth, and React.

### UI behavior and presentation

- Location: `src/components/saq/`, `src/app/saq/*`
- Layout, hierarchy, dashboard/report composition, PDF readability.
- PDF: `AssessmentReportPDF` via `@react-pdf/renderer` — align with report hierarchy and engine outputs.
- Version routing: `useAssessmentVersionRoute` and management UI (`AssessmentVersionsPanel`, manage routes).

### Persistence and data access

- **Client facade:** `src/lib/saq/assessment.repository.ts` → `POST /api/saq/repository`.
- **Selector:** `SAQ_DATABASE_PROVIDER` → `repositories/assessment.repository.postgres.ts`
- **PostgreSQL:** `src/lib/db/drizzle.ts`, `drizzle/schema.ts`, `drizzle/migrations/` — `npm run db:migrate` or Compose `migrate` profile (`docs/DOCKER.md`). Do not run migrations inside the production `app` image.
- Map DB rows to domain types in repositories; keep UI/engine unaware of row shape.

### Access control (auth and collaboration)

- Extend `src/lib/saq/permissions.ts` (roles, version status, edit/create-version/delete/export helpers).
- Enforce in the active repository implementation and API route.
- Routes: `src/middleware.ts` for protected SAQ workflow paths; primary login NextAuth (`/login`, `/signup`).
- UI: permission helpers + `readOnly` props — do not scatter role string checks.

### Base path and deploy URLs

- Use `withBasePath` / `appFetch` / `assetUrl` from `src/lib/base-path.ts` for fetches and static assets under `NEXT_PUBLIC_BASE_PATH`.
- Domain deploy checklist: `docs/DOCKER.md`.

## Common Mistakes to Avoid

- Duplicating scoring/prioritization in UI components.
- Storing derived metrics in runtime tables.
- Moving static questionnaire content into the database.
- Mixing raw DB row types into UI contracts.
- Ignoring `versionId` when loading/saving scope, answers, or action metadata.
- Duplicating collaborator or role rules outside `permissions.ts` and the repository.
- Making report/export changes that alter business-logic outputs.
- Running `drizzle-kit` inside the production `app` container.

## Memory Layer Map

| Layer | Location | Purpose |
|-------|----------|---------|
| Cursor rules | `.cursor/rules/*.mdc` | Concise, implementation-focused constraints during coding |
| Human docs | `docs/*.md` | Onboarding, architecture, ops, legacy setup |
| Product README | `README.md` | External overview and getting started |

Prefer linking between docs/rules rather than copying long blocks.

## Updating Memory After Milestones

1. Update the relevant `.cursor/rules/*.mdc` first (behavioral guidance).
2. Update the matching `docs/` file for narrative/onboarding.
3. Keep `docs/SAQ_PROJECT_CONTEXT.md` as the broad quick-reference anchor.
4. Touch `docs/DOCKER.md` when Compose, env, or deploy procedures change.
