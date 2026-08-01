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
* **Backend / DB:** PostgreSQL (Drizzle ORM; optional Supabase path where still wired)
* **Data Model:** JSON-based questionnaire + relational persistence
* **Export:** PDF via `@react-pdf/renderer` (engine-derived data)

---

## Architecture Overview

The system follows a modular architecture:

### 1. Static Questionnaire Layer

* Defined in JSON
* Contains themes, scope items, questions, and answer options

### 2. Runtime Assessment Layer

* Stores user responses and scope selections
* Managed via the configured repository (**Postgres** or legacy **Supabase** via `SAQ_DATABASE_PROVIDER`)

### 3. SAQ Engine

Located in `src/lib/saq/engine/`

* `scoring.ts` → calculates capability scores
* `results.ts` → builds aggregated results
* `actions.ts` → generates action plans
* `interpretation.ts` → produces readiness insights

### 4. UI Layer

* Assessment flow (step-based)
* Dashboard and analytics
* Report view

### 5. Report & Export Layer

* Report page composes engine outputs; PDF is generated with `@react-pdf/renderer` (`AssessmentReportPDF`)

---

## Project Structure (Simplified)

```
src/
  app/saq/
    assessment/
    dashboard/
    report/

  components/saq/

  lib/
    saq/
      engine/
      utils/
      questionnaire.data.json
    supabase/

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

For **PostgreSQL + NextAuth** (recommended), create `.env.local` with at least:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
SAQ_DATABASE_PROVIDER=postgres
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-long-random-secret
```

Set `NEXTAUTH_SECRET` to a strong value (never commit real secrets).

A legacy Supabase-based setup may still require `NEXT_PUBLIC_SUPABASE_*` variables where that code path is enabled.

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
4. `/saq/assessment/[assessmentId]`
   - step-based assessment workflow
   - explicit **Save progress** button (scope, answers, action metadata)
5. `/saq/dashboard/[assessmentId]` and `/saq/report/[assessmentId]`
   - clear navigation back to assessment editor and assessment workspace

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

This project includes a structured documentation layer:

* `docs/SAQ_PROJECT_CONTEXT.md` → project overview
* `docs/SAQ_ARCHITECTURE.md` → technical design
* `docs/SAQ_DEVELOPMENT_WORKFLOW.md` → development guidance
* `.cursor/rules/` → AI-assisted development rules

These ensure consistency across development and enable easier onboarding for contributors.

---

## Use Cases

* Sustainability self-assessment for research infrastructures
* Internal benchmarking and improvement planning
* Supporting sustainability reporting and transparency
* Preparing for certification baseline development

---

## Contact

For collaboration, research integration, or contributions, please reach out to Adnan (a.tahir2@uva.nl)
