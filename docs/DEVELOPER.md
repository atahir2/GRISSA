# GRISSA — Developer & operator guide

Technical entry point for running, deploying, and extending the tool.  
**Product overview for users and partners:** [README.md](../README.md).

Related docs:

| Doc | Purpose |
|-----|---------|
| [SAQ_PROJECT_CONTEXT.md](SAQ_PROJECT_CONTEXT.md) | Onboarding and product context |
| [SAQ_ARCHITECTURE.md](SAQ_ARCHITECTURE.md) | Technical layers and data flow |
| [SAQ_DEVELOPMENT_WORKFLOW.md](SAQ_DEVELOPMENT_WORKFLOW.md) | Where to implement; memory habits |
| [DOCKER.md](DOCKER.md) | Compose, migrations, domain deploy |

---

## Tech stack

| Area | Choice |
|------|--------|
| App | Next.js 14 (App Router), React, Tailwind CSS |
| Auth | NextAuth (credentials) + JWT sessions |
| Runtime DB (recommended) | PostgreSQL + Drizzle ORM |
| Questionnaire | Static JSON (`questionnaire.data.json`) — not stored in the DB |
| PDF | `@react-pdf/renderer` (`AssessmentReportPDF`) |
| Deploy | Optional Docker Compose — [DOCKER.md](DOCKER.md) |

---

## Architecture (summary)

Detail: [SAQ_ARCHITECTURE.md](SAQ_ARCHITECTURE.md).

| Layer | Role |
|-------|------|
| Static questionnaire | Themes, scope items, questions, answer options in JSON |
| Runtime assessment | Assessments, **versions**, collaborators, scope/answers/action metadata (Postgres) |
| SAQ engine | Pure TypeScript: scoring, results, actions, interpretation, scope helpers |
| Presentation | Home, Workspace, assessment steps, dashboard, report/PDF |
| Access | NextAuth + `permissions.ts` + repository guards |

UI calls the repository facade → `POST /api/saq/repository`. Derived scores and summaries are recomputed in memory and are **not** persisted.

```mermaid
flowchart LR
  UI[UI pages / components]
  Facade[assessment.repository facade]
  API["POST /api/saq/repository"]
  Runtime[Postgres runtime]
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
```

---

## Getting started (local)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy [`env.example`](../env.example) → `.env.local`. For **PostgreSQL + NextAuth** (recommended), set at least:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DATABASE
SAQ_DATABASE_PROVIDER=postgres
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-long-random-secret
```

- Use a strong `NEXTAUTH_SECRET` (never commit real secrets). `AUTH_SECRET` is accepted as an alias.
- Optional: `NEXT_PUBLIC_BASE_PATH` for a URL prefix at build time (see `next.config.js` / [DOCKER.md](DOCKER.md)).

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

Full guide: **[DOCKER.md](DOCKER.md)**.  
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

## Application routes (reference)

| Route | Role |
|-------|------|
| `/signup`, `/login` | Account registration and sign-in |
| `/saq` | Public Home (introduction) |
| `/saq/manage` | Workspace — list/create assessments |
| `/saq/manage/[assessmentId]` | Team access and assessment versions |
| `/saq/assessment/[assessmentId]?versionId=…` | Scope → questionnaire → results → action plan |
| `/saq/dashboard/[assessmentId]` | Dashboard |
| `/saq/report/[assessmentId]` | Web report + PDF export |

| Role | Typical access |
|------|----------------|
| **Owner** | Edit draft content, create versions, manage collaborators, delete assessment, dashboard/report |
| **Editor** | Edit draft content, create versions, dashboard/report |
| **Reviewer** | Read-only (reserved for future review features) |
| **Viewer** | Read-only |

---

## Development guidelines

- Keep business logic in `src/lib/saq/engine/` (pure TS: no React, DB, or auth).
- Do **not** persist derived results (scores, summaries, priorities, recommendations, interpretation).
- UI should call the repository facade and engine modules — do not reimplement scoring or prioritisation in components.
- The report/`AssessmentReportPDF` path is the PDF export source of truth (engine-derived data).

More: [SAQ_DEVELOPMENT_WORKFLOW.md](SAQ_DEVELOPMENT_WORKFLOW.md).
