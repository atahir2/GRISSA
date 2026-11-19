# Supabase → PostgreSQL Migration Status

**Status:** Primary product path is **PostgreSQL + Drizzle + NextAuth**. The staged plan in earlier drafts of this file is **complete** for day-to-day development and Docker deploys.

This document is a **status pointer**, not an active migration playbook. Architecture: `docs/SAQ_ARCHITECTURE.md`. Ops: `docs/DOCKER.md`. Legacy Supabase hosting: `docs/SAQ_SUPABASE_SETUP.md`.

## What is live today

| Concern | Current state |
|---------|----------------|
| Runtime SAQ data (recommended) | `SAQ_DATABASE_PROVIDER=postgres` → Drizzle repositories + `DATABASE_URL` |
| Auth | NextAuth credentials + JWT; Drizzle adapter against Postgres `users` / related Auth.js tables |
| Repository selection | `src/lib/saq/repositories/assessment.repository.selector.ts` (`postgres` \| `supabase`) |
| Client IO | Facade `assessment.repository.ts` → `POST /api/saq/repository` |
| Versions | `assessment_versions`; scope/answers/action metadata keyed by `version_id` |
| Docker | Compose stack with `postgres`, `app`, `migrate`, optional `adminer` |
| Middleware | `src/middleware.ts` — NextAuth `getToken`; optional Supabase cookie refresh only if `NEXT_PUBLIC_SUPABASE_*` set |

If `SAQ_DATABASE_PROVIDER` is **unset**, the selector still defaults to **`supabase`**. Set **`postgres`** explicitly (Compose examples already do).

## What remains (legacy / optional)

- Supabase client modules under `src/lib/supabase/`
- `repositories/assessment.repository.supabase.ts` and `supabase/migrations/`
- `/auth/callback` Supabase `?code=` exchange for old OAuth/email flows
- Optional middleware cookie refresh when Supabase env vars are present

Do **not** treat those as the default for new environments. Prefer Postgres + NextAuth as documented in `README.md` and `docs/DOCKER.md`.

## Historical note

An earlier audit (branch context `migration/postgres-decoupling`) described Supabase as the default backend and proposed stages (`SAQ_BACKEND`, dual-write, etc.). That plan has been superseded by:

- Provider flag **`SAQ_DATABASE_PROVIDER`**
- Full Postgres repository + Drizzle schema/migrations
- NextAuth as primary app auth
- Versioned runtime model on both providers

Do not re-apply Stage 0–6 guidance from old copies of this document; follow the architecture and Docker docs instead.
