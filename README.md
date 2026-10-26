# incepta-meridian-intelligence

Local prototype for Meridian Intelligence, a Forward Deployed Engineering exercise about a fictional HVAC services company. The prototype is meant to answer three questions:

1. What is happening to revenue, especially H1 2026?
2. Which customers are at risk, and why?
3. Which data quality issues affect confidence in the reported numbers?

Those questions are not answered yet. This repository has the monorepo, the database, and the package boundaries. It does not invent financial results. The client CSV exports are in `data/raw/`. What those files contain, which issues are confirmed, and which questions are still open is written up in [docs/data-profiling.md](docs/data-profiling.md). Column parsing is not implemented yet.

## Structure

```
apps/web                 Vite + React, browser only. Port 3000. Depends only on @meridian/contracts.
apps/api                 Fastify API. Port 3001. Composition root for the packages below.
packages/db              Prisma schema, generated client, generate, and migrate.
packages/pipeline        CSV import CLI. Runs without the HTTP server.
packages/domain          Deterministic business rules. No calculations yet.
packages/contracts       Shared Zod API contracts.
packages/ai              LLM provider abstraction. No financial metrics.
data/raw                 Original client CSV exports.
docs/                    Case brief and the data-profiling note.
```

Root files used to start the project: `pnpm-workspace.yaml`, `turbo.json`, `docker-compose.yml`, and `.env.example`.

## Dependency rules

- `contracts`, `domain`, `pipeline`, and `db` do not depend on other workspace packages.
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

   The schema has no models yet. `pnpm db:migrate` exits successfully and says that migration is skipped until a schema is derived from the client exports.

5. Inspect CSV exports without starting the web app or the API:

   ```sh
   pnpm run import
   ```

   `pnpm import` is pnpm's own lockfile converter, so the project command includes `run`. With an empty `data/raw/`, this prints `No client exports in data/raw.` If CSV files are added later, it lists their names and sizes and does not parse columns.

6. Start the web app and the API together. Turborepo builds the shared packages first:

   ```sh
   pnpm dev
   ```

   - Web: http://localhost:3000
   - API health: http://localhost:3001/health
   - API database readiness: http://localhost:3001/ready

7. Start one process on its own after the packages have been built:

   ```sh
   pnpm --filter @meridian/api dev
   pnpm --filter @meridian/web dev
   ```

8. Stop PostgreSQL:

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