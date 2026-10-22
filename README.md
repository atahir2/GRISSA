# GRISSA — Green Research Infrastructure Sustainability Self Assessment

**GRISSA** (also referred to as **SAQ**) is a web-based sustainability self-assessment tool for research infrastructures, datacenters, digital infrastructures, and organisations. It is developed in the context of **GreenDIGIT** and produces a capability/readiness **baseline**, priority gaps, action plans, dashboard views, and PDF reports for planning and standards-alignment discussion.

GRISSA is **not a certification system** and does not issue certification decisions. Outputs support preparation and internal planning (e.g. audits, directives, or organisational goals).

---

## Table of contents

- [What it does](#what-it-does)
- [Key features](#key-features)
- [Tech stack](#tech-stack)
- [Architecture (summary)](#architecture-summary)
- [Repository layout](#repository-layout)
- [Getting started (local)](#getting-started-local)
- [Docker](#docker)
- [npm scripts](#npm-scripts)
- [User workflow and roles](#user-workflow-and-roles)
- [Development guidelines](#development-guidelines)
- [Documentation index](#documentation-index)
- [Contact](#contact)

---

## What it does

Organisations use GRISSA to:

- Evaluate sustainability practices across multiple themes (e.g. governance, energy, monitoring, circularity, water, lifecycle)
- Score capability levels (typically Level 1–3) and identify gaps against optional targets
- Prioritise improvements (High / Medium / Low) and generate structured action plans
- Review results on an interactive dashboard
- Export a stakeholder-ready PDF report for baseline and standards-alignment discussion

Typical use cases: internal benchmarking, improvement planning, sustainability reporting support, and preparing a baseline for future certification or standards pathways — without treating the tool as a certifier.

---

## Key features

| Area | What you get |
|------|----------------|
| **Structured self-assessment** | Multi-theme questionnaire with scope selection and optional target levels |
| **Scoring & interpretation** | Capability levels, gap analysis, priority classification, stakeholder-oriented interpretation |
| **Action plans** | Engine-derived recommendations with implementation priority and effort estimates |
| **Dashboard** | Theme performance, priorities, and readiness-oriented overview |
| **PDF report** | Print-friendly export via `@react-pdf/renderer` from the same engine outputs |
| **Auth** | Signup / login with **NextAuth** (credentials) and JWT sessions |
| **Collaboration** | Share assessments with roles: owner, editor, reviewer, viewer |
| **Versioned assessments** | Runtime state keyed by `version_id`; content edits only on **draft** versions (owner/editor) |
| **Workspace navigation** | Main nav: **Home** (`/saq`) and **Workspace** (`/saq/manage`) |

---

## Tech stack

| Area | Choice |
|------|--------|
| App | Next.js 14 (App Router), React, Tailwind CSS |
| Auth | NextAuth (credentials) + JWT sessions |
| Runtime DB (recommended) | PostgreSQL + Drizzle ORM |
| Questionnaire | Static JSON (`questionnaire.data.json`) — not stored in the DB |
| PDF | `@react-pdf/renderer` (`AssessmentReportPDF`) |
| Deploy | Optional Docker Compose — [docs/DOCKER.md](docs/DOCKER.md) |


---

## Architecture (summary)

Detail: [docs/SAQ_ARCHITECTURE.md](docs/SAQ_ARCHITECTURE.md).

| Layer | Role |
|-------|------|
| Static questionnaire | Themes, scope items, questions, answer options in JSON |
| Runtime assessment | Assessments, **versions**, collaborators, scope/answers/action metadata (Postgres or Supabase) |
| SAQ engine | Pure TypeScript: scoring, results, actions, interpretation, scope helpers |
| Presentation | Home, Workspace, assessment steps, dashboard, report/PDF |
| Access | NextAuth + `permissions.ts` + repository guards (RLS only on the Supabase path) |

UI calls the repository facade → `POST /api/saq/repository`. Derived scores and summaries are recomputed in memory and are **not** persisted.

```mermaid
flowchart LR
  UI[UI pages / components]
  Facade[assessment.repository facade]
  API["POST /api/saq/repository"]
  Runtime[Postgres or Supabase runtime]
  Engine[SAQ engine]
  UI --> Facade --> API --> Runtime
  UI --> Engine
  Engine -.->|in-memory only| UI
```

---

## Repository layout

```
src/
  app/saq/           # Home, manage, assessment, dashboard, report
  app/api/           # NextAuth, register, saq/repository
  components/saq/    # Feature UI (incl. AssessmentReportPDF)
  components/auth/   # Login / signup
  lib/saq/           # Engine, repositories, permissions, questionnaire JSON
  lib/auth/          # NextAuth options
  lib/db/            # Drizzle + pg
  middleware.ts      # NextAuth JWT gate
drizzle/             # Schema + migrations
docs/                # Human reference docs
.cursor/rules/       # Cursor coding rules
```

---

## Getting started (local)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy [`env.example`](env.example) → `.env.local`. For **PostgreSQL + NextAuth** (recommended), set at least:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DATABASE
SAQ_DATABASE_PROVIDER=postgres
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-long-random-secret
```

- Use a strong `NEXTAUTH_SECRET` (never commit real secrets). `AUTH_SECRET` is accepted as an alias.
- If `SAQ_DATABASE_PROVIDER` is unset, the app falls back to the legacy `supabase` path — set `postgres` explicitly for new work.
- Optional: `NEXT_PUBLIC_BASE_PATH` for a URL prefix at build time (see `next.config.js` / [docs/DOCKER.md](docs/DOCKER.md)).
- Legacy Supabase DB path: `NEXT_PUBLIC_SUPABASE_*` and [docs/SAQ_SUPABASE_SETUP.md](docs/SAQ_SUPABASE_SETUP.md).

### 3. Apply migrations (Postgres)

```bash
npm run db:migrate
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Docker

Optional full stack (Postgres + app + Adminer). The **`app` image is production-only** and does **not** include `drizzle-kit` — apply schema with the Compose **`migrate`** service (or host `npm run db:migrate`), never by exec’ing into `saq-app`.

**Typical first-time / production-style sequence** (use `.env.production` or your env file; `DATABASE_URL` host should be **`postgres`** inside Compose):

```bash
docker compose --env-file .env.production up -d postgres
docker compose --profile migrate --env-file .env.production run --rm migrate
docker compose --env-file .env.production up -d --build app
```

**Local Compose helpers** (`.env.docker`): copy `.env.docker.example` → `.env.docker`, then `npm run docker:up` and `npm run docker:migrate` once. App: [http://localhost:3000](http://localhost:3000) · Adminer: [http://localhost:8080](http://localhost:8080).

Full guide (env files, troubleshooting, domain deploy): **[docs/DOCKER.md](docs/DOCKER.md)**.  
**Never use `docker compose down -v` unless you intend to wipe the database volume.**

---

## npm scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js development server |
| `npm run build` / `start` | Production build and start |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate Drizzle migrations from `drizzle/schema.ts` |
| `npm run db:migrate` | Apply migrations (`DATABASE_URL` required) |
| `npm run db:studio` | Drizzle Studio |
| `npm run docker:up` | Compose up with `.env.docker` |
| `npm run docker:down` | Compose down (`.env.docker`) |
| `npm run docker:migrate` | Migrate profile with `.env.docker` |
| `npm run docker:migrate:prod` | Migrate profile with `.env.production` |

---

## User workflow and roles

Authenticated flow:

1. **Signup / login** — `/signup`, `/login`
2. **Home** — `/saq` (GRISSA introduction)
3. **Workspace** — `/saq/manage` (list/create assessments; open dashboard/report; delete if owner)
4. **Team & versions** — `/saq/manage/[assessmentId]`
5. **Assessment** — `/saq/assessment/[assessmentId]?versionId=…` (scope → questionnaire → results → action plan; **Save progress**; edits only on **draft** for owner/editor)
6. **Dashboard / report** — `/saq/dashboard/[assessmentId]` and `/saq/report/[assessmentId]` (same version context)

| Role | Typical access |
|------|----------------|
| **Owner** | Edit draft content, create versions, manage collaborators, delete assessment, dashboard/report |
| **Editor** | Edit draft content, create versions, dashboard/report |
| **Reviewer** | Read-only (reserved for future review features) |
| **Viewer** | Read-only |

Branding in the UI: **GRISSA** — *Green Research Infrastructure Sustainability Self Assessment*. Nav: **Home** and **Workspace**.

---

## Development guidelines

- Keep business logic in `src/lib/saq/engine/` (pure TS: no React, DB, or auth).
- Do **not** persist derived results (scores, summaries, priorities, recommendations, interpretation).
- UI should call the repository facade and engine modules — do not reimplement scoring or prioritisation in components.
- The report/`AssessmentReportPDF` path is the PDF export source of truth (engine-derived data).

More: [docs/SAQ_DEVELOPMENT_WORKFLOW.md](docs/SAQ_DEVELOPMENT_WORKFLOW.md).

---

## Documentation index

| Doc / folder | Purpose |
|--------------|---------|
| [docs/SAQ_PROJECT_CONTEXT.md](docs/SAQ_PROJECT_CONTEXT.md) | Onboarding and product context |
| [docs/SAQ_ARCHITECTURE.md](docs/SAQ_ARCHITECTURE.md) | Technical layers and data flow |
| [docs/SAQ_DEVELOPMENT_WORKFLOW.md](docs/SAQ_DEVELOPMENT_WORKFLOW.md) | Where to implement; memory habits |
| [docs/DOCKER.md](docs/DOCKER.md) | Compose, migrations, domain deploy |
| [docs/SAQ_SUPABASE_SETUP.md](docs/SAQ_SUPABASE_SETUP.md) | Legacy Supabase-hosted path |
| [docs/SAQ_SUPABASE_TO_POSTGRES_MIGRATION.md](docs/SAQ_SUPABASE_TO_POSTGRES_MIGRATION.md) | Migration status (Postgres path is live) |
| [`.cursor/rules/`](.cursor/rules/) | Concise Cursor coding rules |

---

## Contact

For collaboration, research integration, or contributions, please reach out to Adnan (a.tahir2@uva.nl).
