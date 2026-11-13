# SAQ Supabase persistence setup (legacy path)

Use this only when running with **`SAQ_DATABASE_PROVIDER=supabase`**. New deployments should use **PostgreSQL + Drizzle + NextAuth** (`docs/DOCKER.md`, `docs/SAQ_ARCHITECTURE.md`).

The recommended app authentication path is **NextAuth**. This guide covers the **Supabase-hosted database** (and historical Supabase Auth / RLS) for the legacy repository implementation.

Runtime tables (logical model; includes versioning):

- **profiles** — one row per auth user (id, optional names)
- **assessments** — organisation name, owner user, timestamps
- **assessment_versions** — version number, label, status (`draft` | `submitted` | `reviewed` | `archived`)
- **assessment_collaborators** — per-assessment access (role, invited_by)
- **assessment_scope_selections** — scope + target capability, keyed by **version_id**
- **assessment_answers** — selected scores, keyed by **version_id**
- **assessment_action_items** — effort/leader/deadline/status/remarks only; priorities are engine-derived, keyed by **version_id**

Static questionnaire stays in `questionnaire.data.json`.

Also see: `docs/SAQ_ARCHITECTURE.md`, `docs/SAQ_DEVELOPMENT_WORKFLOW.md`, `docs/SAQ_SUPABASE_TO_POSTGRES_MIGRATION.md`.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Create a new project (or use an existing one).
3. In **Project Settings → API**, note:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 2. Run the migrations

### Option A: Supabase Dashboard (SQL Editor)

Run migrations **in order**:

1. `supabase/migrations/20250310000000_create_saq_runtime_tables.sql`
2. `supabase/migrations/20250310100000_saq_rls_policies.sql` (anon policies; superseded when auth is enabled)
3. `supabase/migrations/20250401120000_auth_profiles_owner_rls.sql` (profiles, `owner_user_id`, user-scoped RLS)
4. `supabase/migrations/20250402120000_assessment_collaborators.sql`
5. `supabase/migrations/20250403130000_fix_rls_recursion_collaborators.sql` (SECURITY DEFINER helpers)
6. `supabase/migrations/20250404140000_assessment_versions.sql`
7. `supabase/migrations/20250405120000_assure_assessment_insert_policy.sql`
8. `supabase/migrations/20250406120000_create_assessment_bundle_rpc.sql`

If you still use Supabase Auth for email confirmation on this path: enable **Email** under **Authentication → Providers**, set `NEXT_PUBLIC_SITE_URL`, and add redirect URLs including `/auth/callback`.

### Option B: Supabase CLI

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

---

## 3. Configure the app

1. Copy `env.example` → `.env.local`.
2. Set at least:
   - `SAQ_DATABASE_PROVIDER=supabase`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (recommended in production; no trailing slash)
3. Restart the Next.js dev server after changing env vars.

For a Postgres-primary local stack instead, ignore this file and follow `docs/DOCKER.md`.

---

## 4. Verify

- Sign in (NextAuth or legacy Supabase flow as configured), open Workspace, start an assessment.
- Confirm a version exists and scope/answers/action metadata save and reload with `?versionId=`.
- Collaborator RLS: shared users can view; only owner/editor edit drafts.

---

## Tables overview

| Table | Purpose |
|-------|---------|
| `profiles` | Display fields per auth user |
| `assessments` | Assessment run + `owner_user_id` |
| `assessment_versions` | Versioned snapshots / draft status |
| `assessment_collaborators` | Roles: owner / editor / reviewer / viewer |
| `assessment_scope_selections` | Per version + scope item |
| `assessment_answers` | Per version + question |
| `assessment_action_items` | Per version + question metadata |

Child rows typically use `ON DELETE CASCADE` from the assessment (and versions cascade to version-scoped children).

---

## Row Level Security (RLS)

- Owner and collaborator policies; edit requires owner or editor (via `rls_user_can_edit_assessment` and related helpers).
- Avoid recursive `SELECT` on `assessment_collaborators` inside its own policies — use bundled `SECURITY DEFINER` helpers (`rls_user_has_assessment_access`, etc.).
- The legacy client uses the **anon** key with the user JWT when Supabase Auth is in play.

**Note:** Early auth migrations may delete legacy `assessments` rows with no `owner_user_id`. New assessments set ownership and insert an owner collaborator row.
