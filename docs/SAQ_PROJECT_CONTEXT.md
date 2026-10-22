# SAQ Project Context

Quick reference for the **Sustainability Self-Assessment (SAQ) / GRISSA** tool. Use this for onboarding and product orientation; technical detail lives in the linked docs.

Related docs:

- `README.md` — user/partner-facing product guide
- `docs/DEVELOPER.md` — run/deploy/extend for developers & operators
- `docs/SAQ_ARCHITECTURE.md` — layers, data flow, folder map
- `docs/SAQ_DEVELOPMENT_WORKFLOW.md` — where to implement changes; memory-layer habits
- `docs/DOCKER.md` — Compose (Postgres + Next.js + Adminer) and migrations
- `docs/SAQ_SUPABASE_SETUP.md` — legacy Supabase-hosted DB path
- `docs/SAQ_SUPABASE_TO_POSTGRES_MIGRATION.md` — migration status (Postgres path is live)

---

## 0. Fast onboarding checklist

1. **Read this file**, then skim `docs/SAQ_ARCHITECTURE.md`.
2. **Run the app** — set env (`DATABASE_URL`, `SAQ_DATABASE_PROVIDER=postgres`, `NEXTAUTH_*`); local Compose: `docs/DOCKER.md`. Then `npm install` and `npm run dev`.
3. **Walk the workflow** — `/saq` (public Home) → sign in → `/saq/manage` (Workspace) → create assessment → Scope → Questionnaire → Results → Action plan → Dashboard → Report/PDF. Runtime data is **versioned** (`?versionId=`).
4. **Know the three core layers** — static JSON questionnaire; runtime DB state; pure engine in `src/lib/saq/engine/*`.
5. **Respect design rules** (section 6) — no questionnaire in DB; no persisted derived scores; UI calls repositories + engine only.

---

## 1. Project purpose

The SAQ is a **Sustainability Self-Assessment** tool for research infrastructures, digital infrastructures, datacenters, and organisations. It helps evaluate sustainability maturity, surface capability gaps, prioritise actions, and produce a structured **baseline** for planning and standards-alignment discussions.

It is **not a certification system**. Report language stays baseline-oriented, not certification-decision language.

**Branding:** **GRISSA** — Green Research Infrastructure Sustainability Self Assessment. Main nav: **Home** (`/saq`) and **Workspace** (`/saq/manage`).

---

## 2. Technology stack

| Area | Choice |
|------|--------|
| App | Next.js App Router, React, Tailwind CSS |
| Runtime DB | **PostgreSQL + Drizzle** (recommended; Docker/Compose) |
| Auth | **NextAuth** (credentials) + Drizzle adapter / JWT sessions |
| Optional legacy DB | Supabase client path when `SAQ_DATABASE_PROVIDER=supabase` |
| PDF | `@react-pdf/renderer` via `AssessmentReportPDF` |
| Deploy | Optional Docker Compose — `docs/DOCKER.md` |

**Provider note:** If `SAQ_DATABASE_PROVIDER` is unset, the selector falls back to `supabase`. New and Compose deployments should set **`postgres`** explicitly (see `env.example`, `.env.docker.example`).

---

## 3. Architecture (summary)

| Layer | Role |
|-------|------|
| Static questionnaire | `questionnaire.data.json` + `questionnaire.repository.ts` — never in DB |
| Runtime assessment | Assessments, **versions**, collaborators, scope, answers, action metadata — Postgres or Supabase via facade |
| Engine | Pure scoring / results / actions / interpretation — no DB or UI |
| Presentation | Assessment flow, dashboard, report/PDF |
| Access control | NextAuth + `permissions.ts` + repository guards; RLS on Supabase path only |

Derived outputs are always recomputed in memory. Full detail: `docs/SAQ_ARCHITECTURE.md`.

---

## 4. UI entry points

| Route | Role |
|-------|------|
| `/saq` | Public Home (`SaqIntro`); shared shell in `app/saq/layout.tsx` |
| `/saq/manage` | Workspace list/create (`SaqLanding`) |
| `/saq/manage/[assessmentId]` | Team & versions management workspace |
| `/saq/assessment/[assessmentId]` | Multi-step flow (`AssessmentLayout`); `?versionId=` |
| `/saq/dashboard/[assessmentId]` | Dashboard |
| `/saq/report/[assessmentId]` | Web report + PDF export |
| `/login`, `/signup` | NextAuth credentials |
| `/auth/callback` | Legacy Supabase `?code=` exchange when that path is used |

Middleware (`src/middleware.ts`) protects assessment / dashboard / report with NextAuth JWT. Collaboration roles: owner, editor, reviewer, viewer (`permissions.ts`).

---

## 5. Current capabilities

- NextAuth sign-up / sign-in / sign-out; optional legacy Supabase callback for old OAuth/email-code flows
- Owned assessments + collaborators; role-aware edit / manage / delete / export
- **Assessment versions** (draft / submitted / reviewed / archived); content edits only on **draft**
- Scope, questionnaire (1–3), live results and action plans via engine
- Dashboard metrics and theme/action distribution
- Report + PDF export from the same engine outputs
- Explicit Save progress; delete assessment (owner); beta banner on SAQ chrome

---

## 6. Important design rules

- Static questionnaire stays file-based only.
- Derived results (scores, priorities, summaries, interpretation) are never persisted.
- Only runtime state is stored (including version-scoped scope/answers/action metadata).
- UI reuses engine modules and the assessment repository facade — no duplicated scoring.
- Engine stays pure: no React, no DB clients, no auth imports.

When extending the system, keep these boundaries so dashboard, report, and assessment flow stay consistent.
