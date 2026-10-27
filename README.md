# incepta-meridian-intelligence

Local prototype for Meridian Intelligence, a Forward Deployed Engineering exercise about a fictional HVAC services company. The prototype is meant to answer three questions:

1. What is happening to revenue, especially H1 2026?
2. Which customers are at risk, and why?
3. Which data quality issues affect confidence in the reported numbers?

Those questions are not answered yet. This repository has the monorepo, the database, and the CSV import. It does not invent financial results. The client CSV exports are in `data/raw/`. What those files contain, which issues are confirmed, and which questions are still open is written up in [docs/data-profiling.md](docs/data-profiling.md).

## Structure

```
apps/web                 Vite + React, browser only. Port 3000. Depends only on @meridian/contracts.
apps/api                 Fastify API. Port 3001. Composition root for the packages below.
packages/db              Prisma schema, generated client, generate, and migrate.
packages/pipeline        CSV import CLI. Runs without the HTTP server. `pnpm run data:import`.
packages/domain          Deterministic business rules. No calculations yet.
packages/contracts       Shared Zod API contracts.
packages/ai              LLM provider abstraction. No financial metrics.
data/raw                 Original client CSV exports.
docs/                    Case brief, data profile, and data model.
```

Root files used to start the project: `pnpm-workspace.yaml`, `turbo.json`, `docker-compose.yml`, and `.env.example`.

## Dependency rules

- `contracts`, `domain`, and `db` do not depend on other workspace packages.
- `pipeline` depends on `db` so the import command can write rows. It does not depend on `domain`, `contracts`, `ai`, or the API.
- `ai` does not depend on `domain` or `db`, and it does not return amounts.
- `web` depends only on `@meridian/contracts`. It does not import Prisma, `pg`, the pipeline, the domain package, or the AI package.
- `api` depends on pipeline, domain, db, contracts, and ai.
- The pipeline CLI does not start the API.

Turborepo schedules tasks across the workspace. The web app is a client-side React application built with Vite. It has no server rendering. The API remains a separate Fastify process.

## Prerequisites

- Node.js 22 or newer
- pnpm 9.15.1 (`packageManager` in the root `package.json`)
- Docker, with the daemon running, for PostgreSQL

`tsc` is TypeScript 7.0.2. ESLint still loads the TypeScript 6.0.2 API, because typescript-eslint does not support TypeScript 7 yet. Both are installed on purpose.

## Bring the project up

1. Install dependencies:

   ```sh
   pnpm install
   ```

2. Create the local env file. The values are development defaults, not production secrets:

   ```sh
   cp .env.example .env
   ```

   `apps/web/.env` is a symlink to the root `.env`, so Vite sees `VITE_API_URL`. The API and Prisma read the root file directly.

3. Start PostgreSQL. The published host port defaults to 5432:

   ```sh
   pnpm db:up
   ```

   Confirm the container is healthy:

   ```sh
   docker compose ps
   ```

   If port 5432 is already taken, set `POSTGRES_PORT` and the port in `DATABASE_URL` to the same free port, then run `pnpm db:up` again.

4. Generate the Prisma client and apply migrations:

   ```sh
   pnpm db:generate
   pnpm db:migrate
   ```

   This applies the PostgreSQL schema described in [docs/data-model.md](docs/data-model.md).

5. Import the client CSV files:

   ```sh
   pnpm run data:import
   ```

   `npm run data:import` runs the same script. `pnpm import` is pnpm's lockfile converter, so the command includes `run`.

   The command reads the five CSV files in `data/raw/` and does not modify them. It prints one line per file with rows read, skipped, flagged, and written, then the totals, the identical copies that were collapsed, and how many source parties were linked, held, or left unmatched, with the invoice dollars in each status.

   Issues on a stored row do not fail the command. A missing file or an unexpected column does, and the process exits non-zero. A second run replaces the invoices, contracts, and notes with the same source ids and does not insert a second copy.

   The database stores the customers, invoices, contracts, notes, and issues that later questions read. It does not store a run history, a copy of every raw cell, one identity per source system, or a human review. Those are pipeline improvements, not part of this load: a run log that can reimport without duplicating and without overwriting a person's decision; an auditable copy of each cell with its hash and line number; a match row per candidate with method and confidence; and a way to mark an issue acknowledged or resolved.

6. Inspect the loaded rows in PostgreSQL:

   ```sh
   docker compose exec postgres psql -U meridian -d meridian -c 'SELECT "linkStatus", count(*) AS invoices, sum(amount) AS dollars FROM "Invoice" GROUP BY 1 ORDER BY 1;'
   ```

   Issue counts by code:

   ```sh
   docker compose exec postgres psql -U meridian -d meridian -c 'SELECT code, severity, count(*) FROM "DataQualityIssue" GROUP BY 1, 2 ORDER BY 3 DESC;'
   ```

7. Start the web app and the API together. Turborepo builds the shared packages first:

   ```sh
   pnpm dev
   ```

   - Web: http://localhost:3000
   - API health: http://localhost:3001/health
   - API database readiness: http://localhost:3001/ready

8. Start one process on its own after the packages have been built:

   ```sh
   pnpm --filter @meridian/api dev
   pnpm --filter @meridian/web dev
   ```

9. Stop PostgreSQL:

   ```sh
   pnpm db:down
   ```

## Other commands

```sh
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```