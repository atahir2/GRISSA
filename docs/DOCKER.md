# Docker Compose (PostgreSQL + Next.js + Adminer)

The SAQ / GRISSA web app runs on **PostgreSQL** with **NextAuth** and **Drizzle** migrations. Compose brings up:

| Service    | Purpose                                                                 |
|-----------|-------------------------------------------------------------------------|
| `postgres` | PostgreSQL 16, persistent volume                                       |
| `app`      | Production Next.js (**standalone** image — **no** Drizzle CLI)         |
| `adminer`  | DB UI (optional)                                                      |
| `migrate`  | **One-shot** migration runner (`drizzle-kit` via `npm ci`; **profile** `migrate`) |

Static questionnaire content stays **file-based**; the engine does **not** persist derived scores in the database.

## Do not run migrations inside the `app` container

The **production Dockerfile** installs only what `next build` needs for the standalone server. **`drizzle-kit` is a devDependency** and is **not** copied into the final `app` image. Running `npm run db:migrate` (or `drizzle-kit`) **inside `saq-app` will fail** or would require bloating the image with dev tooling.

**Use the dedicated `migrate` service** (or run `npm run db:migrate` on the host with a correct `DATABASE_URL`). The migrate container runs `npm ci` (including devDependencies), then `drizzle-kit migrate`, on the Compose network with hostname **`postgres`**.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2
- This repository cloned locally

## 1. Environment file

**Local / default:** copy `.env.docker.example` → `.env.docker` and edit secrets.

**Production-style file:** copy `.env.production.example` → `.env.production`. That example sets:

```env
COMPOSE_ENV_FILE_PATH=.env.production
```

so Compose mounts the same file into `postgres`, `app`, `adminer`, and `migrate`. If you omit `COMPOSE_ENV_FILE_PATH`, the default is **`.env.docker`**.

Edit the env file you use:

- Set **`POSTGRES_PASSWORD`** and **`NEXTAUTH_SECRET`** to strong values.
- **`DATABASE_URL`** must use host **`postgres`** (the Compose service name) when used from containers, e.g.  
  `postgresql://USER:PASSWORD@postgres:5432/DATABASE` — **not** `localhost`.
- **`NEXTAUTH_URL`** must match how users reach the app.
- **`NEXT_PUBLIC_BASE_PATH`** — empty for root deployment in Docker (see `next.config.js` for subpath builds).

Do **not** commit real env files.

## 2. Recommended startup order (first deploy or after schema changes)

Use the env file you maintain (`.env.docker` or `.env.production`). Examples below use **`.env.production`**; swap for `.env.docker` for local stacks.

```bash
docker compose --env-file .env.production up -d postgres
docker compose --profile migrate --env-file .env.production run --rm migrate
docker compose --env-file .env.production up -d --build app
```

You can start **adminer** anytime after Postgres is healthy:

```bash
docker compose --env-file .env.production up -d adminer
```

**Equivalent one-liner** after Postgres is already up (typical local dev):

```bash
docker compose --env-file .env.docker up --build -d
```

Then run migrations once (migrate is **not** started by plain `up` — it uses **profile** `migrate`):

```bash
docker compose --profile migrate --env-file .env.docker run --rm migrate
```

Or: `npm run docker:migrate` (uses `.env.docker` — adjust the script or invoke `docker compose` with your `--env-file` if needed).

## 3. Run database migrations (reference)

**Inside Docker (recommended):**

```bash
docker compose --profile migrate --env-file .env.docker run --rm migrate
```

**From the host** (Postgres port exposed to localhost, URL uses `127.0.0.1`):

```bash
# Windows PowerShell
$env:DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/DB"
npm run db:migrate

# bash
export DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/DB"
npm run db:migrate
```

npm scripts:

- `npm run db:generate` — generate SQL from `drizzle/schema.ts` (`drizzle-kit generate`)
- `npm run db:migrate` — apply migrations in `drizzle/migrations/` (`drizzle-kit migrate`)
- `npm run db:studio` — Drizzle Studio (requires a reachable `DATABASE_URL`)

## 4. Open the services

- **App:** [http://localhost:3000](http://localhost:3000) (or your `APP_HOST_PORT`)
- **Adminer:** [http://localhost:8080](http://localhost:8080)  
  - From **Adminer in Docker**, server host **`postgres`**. From the **host OS**, use **127.0.0.1** and mapped Postgres port.

## 5. Stop containers

```bash
docker compose --env-file .env.docker down
```

Or: `npm run docker:down`

### Data loss warning

```bash
docker compose --env-file .env.docker down -v
```

**`-v`** removes named volumes, including **`saq_postgres_data`**, which **deletes the database**.

## 6. Verify the app

1. Migrations completed without errors.
2. `docker compose --env-file .env.docker ps` — Postgres **healthy**, `saq-app` **running**.
3. Open the app URL — GRISSA intro; sign up / sign in (NextAuth + Postgres).
4. Create an assessment from Workspace and confirm data in Adminer.

## 7. Optional port overrides

In your env file:

- `POSTGRES_HOST_PORT` (default `5432`)
- `APP_HOST_PORT` (default `3000`)
- `ADMINER_HOST_PORT` (default `8080`)

## Build notes

- The **Dockerfile** does not bake `.env*` files; Compose **`env_file`** injects runtime config.
- **`NEXT_PUBLIC_BASE_PATH`** is a **build** argument from the env file used at build time. Rebuild after changing it: `docker compose ... build --no-cache app`.

## Domain deployment (outside localhost)

Symptoms fixed in-repo: **middleware no longer depends on Supabase** for Postgres-only stacks; **`basePath`** no longer silently defaults to `/grisc-sa` in production (root deploy matches Docker unless you explicitly set `/grisc-sa` at build).

1. **`NEXTAUTH_URL`** (server env): use the **canonical site URL including `basePath`**, e.g. `https://mc-a4.lab.uvalight.net/grissa`, for server-side auth and redirects. Wrong host or `http` vs `https` breaks sessions.

2. **Rebuild** whenever `NEXT_PUBLIC_BASE_PATH` changes. Root: unset or empty. Subpath examples: **`/grissa`**, **`/grisc-sa`** (see `scripts/nginx-subpath.example.conf`; proxy must forward the full path unchanged).

3. **Reverse proxy** must pass **`/_next/static`**, **`/_next/data`**, and other **`/_next/*`** to Node (or JS routes break). **`public`** files resolve as **`{basePath}/your-file`** — e.g. logos at **`/grissa/acknowledgements/…`**. **`unoptimized`** `next/image` can emit **`/acknowledgements/…`** without the prefix unless you pass URLs from **`assetUrl()`** (`src/lib/base-path.ts`).

4. **Same-origin API calls:** use **`appFetch()`** / **`withBasePath()`** from `src/lib/base-path.ts` instead of raw **`fetch("/api/…")`**. **`AuthSessionProvider`** sets **`SessionProvider basePath={withBasePath("/api/auth")}`** so NextAuth client (`signIn`, `useSession`, CSRF) calls **`{basePath}/api/auth/*`** (NextAuth’s default client URL logic does not know Next.js `basePath` unless this is set).

5. **Use the production env file for production stacks.** Set **`COMPOSE_ENV_FILE_PATH=.env.production`** in `.env.production` (see `.env.production.example`). If you omit it, Compose defaults to **`.env.docker`** (`NEXTAUTH_URL=http://localhost:3000`, empty `NEXT_PUBLIC_BASE_PATH`) even when you pass `--env-file .env.production` on the CLI — the **mounted** env inside containers still comes from the default unless `COMPOSE_ENV_FILE_PATH` is set. After changing env, recreate the app:  
   `docker compose --env-file .env.production up -d --build app`

## Production deployment checklist

Use this on a server (e.g. behind nginx at `/grissa`):

1. Copy **`.env.production.example`** → **`.env.production`**; set strong secrets and **`COMPOSE_ENV_FILE_PATH=.env.production`**.
2. Set **`DATABASE_URL`** with host **`postgres`** (Compose service name), not `localhost`.
3. Set **`NEXTAUTH_URL`** to the public app root **including `basePath`**, e.g. `https://mc-a4.lab.uvalight.net/grissa` — **not** `…/grissa/saq` and not `http://localhost:3000`.
4. Set **`NEXT_PUBLIC_BASE_PATH=/grissa`** (or your subpath); **rebuild** the `app` image after any change.
5. Start Postgres → run **migrate** → build and start **app** (see [§2](#2-recommended-startup-order-first-deploy-or-after-schema-changes)).
6. Confirm **PostgreSQL `pg_hba.conf`** allows the app container (see [§8](#8-troubleshooting-sign-up--sign-in-database--auth)).
7. Smoke-test: sign up, sign in, open Workspace, create an assessment.

## 8. Troubleshooting sign-up / sign-in (database + auth)

Symptoms: **Registration failed**, **Sign in failed**, or API errors mentioning **`Failed query`** / **`pg_hba.conf rejects connection`**. The UI and static assets may still load fine.

### A. Wrong env file inside containers

Check what the app actually sees:

```bash
docker exec saq-app env | grep -E 'NEXTAUTH_URL|NEXT_PUBLIC_BASE_PATH|SAQ_DATABASE'
```

| Expected (subpath example) | Wrong (common) |
|----------------------------|----------------|
| `NEXTAUTH_URL=https://host/grissa` | `NEXTAUTH_URL=http://localhost:3000` |
| `NEXT_PUBLIC_BASE_PATH=/grissa` (baked at build + runtime) | empty base path while nginx serves `/grissa` |

Fix: set **`COMPOSE_ENV_FILE_PATH=.env.production`** in `.env.production`, fix values, then  
`docker compose --env-file .env.production up -d --build app`.

### B. PostgreSQL `pg_hba.conf` blocks the app container

The app connects to Postgres as the user in **`DATABASE_URL`** (often **`postgres`**) over the **Docker bridge network** (e.g. client IP `172.22.x.x`). Postgres uses the **first matching rule** in **`pg_hba.conf`**.

A frequent production issue: **hardening rules at the top of the file** that reject remote `postgres` logins:

```text
host all postgres 0.0.0.0/0 reject
host all postgres ::/0 reject
```

These match **before** any `hostnossl … 172.16.0.0/12 …` rules added at the bottom, so **`saq-app` cannot connect** even on the internal Compose network. Sign-up and login both fail because every auth path hits the database.

**Inspect rules (note line numbers):**

```bash
docker exec grisc-postgres grep -n '^host' /var/lib/postgresql/data/pg_hba.conf
docker exec grisc-postgres psql -U postgres -d grisc_sa -c \
  "SELECT line_number, type, user_name, address, auth_method FROM pg_hba_file_rules WHERE type LIKE 'host%' ORDER BY line_number;"
```

**Fix (allow Compose network above reject rules):** insert at **line 1** of `pg_hba.conf` (Postgres in this stack has **`ssl=off`**, so use **`hostnossl`**):

```text
hostnossl all all 172.16.0.0/12 scram-sha-256
```

Commands on the server:

```bash
docker exec grisc-postgres grep -q '172.16.0.0/12' /var/lib/postgresql/data/pg_hba.conf || \
  docker exec grisc-postgres sed -i '1i hostnossl all all 172.16.0.0/12 scram-sha-256' /var/lib/postgresql/data/pg_hba.conf

docker restart grisc-postgres
```

`172.16.0.0/12` covers typical Docker bridge subnets (`172.16.x`–`172.31.x`). If your network uses a different range, adjust the CIDR or add a line for your subnet (e.g. `172.22.0.0/16`).

**Do not** rely on **`pg_reload_conf()`** alone after reordering rules — **`docker restart grisc-postgres`** is safer.

**Optional hardening:** use a dedicated DB role (e.g. `grisc_app`) in **`DATABASE_URL`** instead of the **`postgres`** superuser, and keep superuser `reject` rules for external IPs only — but always place an **allow** rule for the Compose network **before** any broad **reject** for the app user.

Reference snippet (also in `scripts/postgres-pg_hba-docker.snippet`):

```text
# Allow non-SSL TCP from Docker Compose bridge networks (must be BEFORE reject rules for the app DB user).
hostnossl all all 172.16.0.0/12 scram-sha-256
```

Changes live in the **`saq_postgres_data`** volume; they survive app restarts but must be reapplied if you recreate the Postgres volume with **`down -v`**.

### C. Verify database connectivity from the app container

```bash
docker exec -w /app saq-app node -e \
  "require('pg').Pool.prototype.query.call(new (require('pg').Pool)({connectionString:process.env.DATABASE_URL}),'select 1').then(()=>console.log('DB_OK')).catch(e=>console.log('DB_FAIL',e.code,e.message))"
```

- **`DB_OK`** — database reachable; if auth still fails, check **`NEXTAUTH_URL`** / cookies / proxy TLS.
- **`DB_FAIL 28000 … pg_hba.conf`** — see [§8.B](#b-postgresql-pg_hbaconf-blocks-the-app-container).
- **`DB_FAIL 28P01`** — wrong password in **`DATABASE_URL`** vs Postgres user password.

After **`DB_OK`**, retry sign-up and sign-in in the browser.
