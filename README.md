# gRISC Self-Assessment Toolkit

Green Research Infrastructure Sustainable Certification Self Assessment (gRISC-SA) is a web-based toolkit for assessing the sustainability maturity of research infrastructures, digital infrastructures, and data centres for a greener certification readiness profile. The system enables structured self-assessment, generates actionable improvement plans, and produces professional reports to support sustainability planning and certification readiness.

---

## Overview

The gRISC Self-Assessment toolkit is designed to transform static sustainability questionnaires into an interactive, data-driven platform.

It allows organisations to:

* evaluate sustainability practices across multiple themes
* identify capability gaps and improvement priorities
* generate structured action plans
* interpret readiness levels
* produce stakeholder-ready reports

The tool supports internal decision-making as well as preparation for sustainability standards alignment and future certification frameworks.

---

## Key Features

* **Structured Self-Assessment**

  * Multi-theme questionnaire covering governance, energy, monitoring, circularity, water, and lifecycle

* **Scoring & Interpretation Engine**

  * Capability levels (Level 1–3)
  * Gap analysis and readiness interpretation
  * Priority classification (High / Medium / Low)

* **Action Plan Generation**

  * Automatically derived recommendations
  * Implementation prioritisation (Immediate → Consolidate)
  * Effort estimation

* **Interactive Dashboard**

  * Theme-wise performance overview
  * Priority distribution
  * Visual readiness indicators

* **Professional Report Export**

  * Structured PDF report
  * Interpretation, summaries, and detailed action plans
  * Suitable for stakeholder review and baseline discussions

---

## Tech Stack

* **Frontend:** Next.js (App Router), React
* **Styling:** Tailwind CSS
* **Auth:** NextAuth (credentials) + JWT sessions
* **Backend / DB:** PostgreSQL + Drizzle ORM (recommended); optional legacy Supabase path via `SAQ_DATABASE_PROVIDER`
* **Data Model:** JSON questionnaire + versioned relational runtime state
* **Export:** PDF via `@react-pdf/renderer` (engine-derived data)
* **Deploy:** optional Docker Compose — [docs/DOCKER.md](docs/DOCKER.md)

---

## Architecture Overview

Modular layers (detail: [docs/SAQ_ARCHITECTURE.md](docs/SAQ_ARCHITECTURE.md)):

1. **Static questionnaire** — JSON themes, scope, questions, answer options
2. **Runtime assessment** — assessments, **versions**, collaborators, scope/answers/action metadata (`SAQ_DATABASE_PROVIDER=postgres` or legacy `supabase`)
3. **SAQ engine** — `scoring`, `results`, `actions`, `interpretation`, `scope` under `src/lib/saq/engine/`
4. **UI** — Home / Workspace / assessment flow / dashboard / report
5. **Export** — `AssessmentReportPDF` from the same engine outputs

UI talks to persistence through the repository facade → `POST /api/saq/repository`.

---

## Project Structure (Simplified)

```
src/
  app/saq/           # Home, manage, assessment, dashboard, report
  app/api/           # NextAuth, register, saq/repository
  components/saq/
  lib/saq/           # engine, repositories, permissions, questionnaire JSON
  lib/auth/          # NextAuth options
  lib/db/            # Drizzle + pg
  lib/supabase/      # legacy provider path
  middleware.ts      # NextAuth JWT gate
drizzle/             # schema + migrations
docs/
.cursor/rules/
```

---

## Getting Started

### 1. Install dependencies

```
npm install
```

### 2. Configure environment

For **PostgreSQL + NextAuth** (recommended), copy `env.example` → `.env.local` and set at least:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
SAQ_DATABASE_PROVIDER=postgres
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-long-random-secret
```

Set `NEXTAUTH_SECRET` to a strong value (never commit real secrets). If `SAQ_DATABASE_PROVIDER` is unset, the app selector falls back to the legacy `supabase` path — set `postgres` explicitly.

Legacy Supabase DB path: `NEXT_PUBLIC_SUPABASE_*` and `docs/SAQ_SUPABASE_SETUP.md`.

### 3. Run the development server

```
npm run dev
```

Open:

```
http://localhost:3000
```

---

## Docker (full stack)

The **`app` image is production-only** — it does **not** include `drizzle-kit`. Apply schema changes with the Compose **`migrate`** service (or `npm run db:migrate` on the host), **never** by exec’ing into `saq-app`. Details: **[docs/DOCKER.md](docs/DOCKER.md)**.

**Typical first-time / production-style sequence** (use `.env.production` or your env file; ensure `DATABASE_URL` uses host **`postgres`** inside Compose):

```bash
docker compose --env-file .env.production up -d postgres
docker compose --profile migrate --env-file .env.production run --rm migrate
docker compose --env-file .env.production up -d --build app
```

**Local dev** (`.env.docker`): `npm run docker:up`, then `npm run docker:migrate` once. App: [http://localhost:3000](http://localhost:3000) · Adminer: [http://localhost:8080](http://localhost:8080).

Stopping: `docker compose --env-file .env.docker down` (`npm run docker:down`).  
**Never use `down -v` unless you intend to wipe the database volume.**

Copy `.env.docker.example` → `.env.docker`, or `.env.production.example` → `.env.production` (see `COMPOSE_ENV_FILE_PATH` in the example).

---

## Database tooling (npm)

- `npm run db:generate` — generate Drizzle migrations from `drizzle/schema.ts`
- `npm run db:migrate` — apply migrations (requires `DATABASE_URL`)
- `npm run db:studio` — Drizzle Studio against the configured database

Compose helpers:

- `npm run docker:up` / `docker:down` / `docker:migrate` (`.env.docker`) / `docker:migrate:prod` (`.env.production`)

---

## Development Guidelines

* Business logic must remain inside `src/lib/saq/engine/`
* Do not persist derived results (scores, actions) in the database
* The report page must remain the single source of truth for PDF export
* UI components should consume engine outputs, not reimplement logic

---

## Navigation and Workflow

Authenticated flow:

1. Login / signup
2. `/saq` (GRISSA introduction page)
3. `/saq/manage` (assessment workspace)
   - start new assessment
   - resume/open assessment
   - view dashboard/report
   - manage team/access and versions (role-dependent)
   - delete assessment (owner only, with confirmation)
4. `/saq/manage/[assessmentId]` — team access and **assessment versions**
5. `/saq/assessment/[assessmentId]?versionId=…`
   - step-based workflow; **Save progress** for scope, answers, action metadata
   - content edits only on **draft** versions (owner/editor)
6. `/saq/dashboard/[assessmentId]` and `/saq/report/[assessmentId]`
   - same version context; navigation back to editor and workspace

Branding:
- Tool label: **GRISSA**
- Expanded form: **Green Research Infrastructure Sustainability Self Assessment**
- Main nav items: **Home** and **Workspace**

Role-aware behavior:

- Owner: delete, manage team access, create versions, edit draft content
- Editor: edit draft content, create versions
- Reviewer/Viewer: read-only access

---

## Documentation & Project Memory

| Doc / folder | Purpose |
|--------------|---------|
| `docs/SAQ_PROJECT_CONTEXT.md` | Onboarding and product context |
| `docs/SAQ_ARCHITECTURE.md` | Technical layers and data flow |
| `docs/SAQ_DEVELOPMENT_WORKFLOW.md` | Where to implement; memory habits |
| `docs/DOCKER.md` | Compose, migrations, domain deploy |
| `docs/SAQ_SUPABASE_SETUP.md` | Legacy Supabase-hosted path |
| `docs/SAQ_SUPABASE_TO_POSTGRES_MIGRATION.md` | Migration status (Postgres path live) |
| `.cursor/rules/` | Concise Cursor coding rules |

---

## Use Cases

* Sustainability self-assessment for research infrastructures
* Internal benchmarking and improvement planning
* Supporting sustainability reporting and transparency
* Preparing for certification baseline development

---

## Contact

For collaboration, research integration, or contributions, please reach out to Adnan (a.tahir2@uva.nl)
