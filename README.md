# Voting Game

A bilingual (English/Spanish) voting elimination game built with Next.js, Express, and MongoDB.

## Stack

- Frontend: Next.js 15, React 19, TypeScript, Tailwind, Clerk
- Backend: Express, Mongoose, Clerk webhook + JWT support
- Database: MongoDB (MongoDB Atlas recommended for production)
- CI/CD: GitHub Actions
- Runtime: Docker Compose (local + EC2)

## Monorepo Structure

```text
.
├── frontend/
├── backend/
├── docker-compose.yml
├── docker-compose.server.yml
├── .github/workflows/
└── infra/scripts/
```

## Prerequisites

- Node.js 20+
- npm 10+
- MongoDB (local or Atlas)
- Clerk app (for production auth)

## Local Development

1. Install dependencies:

```bash
npm install --legacy-peer-deps
```

2. Configure backend env in `backend/.env`:

```dotenv
PORT=5050
NODE_ENV=development
MONGODB_URI=your_mongodb_uri
ENABLE_DEV_AUTH_FALLBACK=true
ADMIN_API_KEY=your-local-admin-key
ALLOWED_ORIGINS=http://localhost:3000
CLERK_WEBHOOK_SECRET=
CLERK_ISSUER=
CLERK_JWKS_URL=
CLERK_AUDIENCE=
```

3. Configure frontend env in `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_API_BASE_URL=http://localhost:5050
NEXT_PUBLIC_DEV_USER_ID=user_voter
```

4. Seed local data:

```bash
npm run seed --workspace=backend
```

5. Start both apps:

```bash
npm run dev
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5050`

## Language Support (English + Spanish)

- UI language switcher is available globally.
- Language preference persists in localStorage and cookie.
- Backend stays language-agnostic and returns machine-readable error `code` values.

## API Contract (Core)

- `GET /api/voting/status`
- `POST /api/votes`
- `GET /api/votes/me?sessionId=current`
- `GET /api/results/latest`
- `GET /api/results/aggregate/:sessionId`
- `GET /api/sessions/history`
- `GET /api/admin/detailed-results/:sessionId` (requires `X-API-Key`)
- `POST /api/admin/sessions/open` (requires `X-API-Key`)
- `POST /api/admin/sessions/close-and-eliminate` (requires `X-API-Key`)

Error responses follow:

```json
{ "code": "ERROR_CODE", "message": "Human-readable message", "details": {} }
```

## Scripts

From repo root:

- `npm run dev`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run ci`

## Testing

- Backend: Jest + Supertest + mongodb-memory-server
- Frontend: Vitest

Run all tests:

```bash
npm run test
```

## Docker

### Local compose

```bash
docker compose up --build
```

This starts:

- `frontend` on `:3000`
- `backend` on `:5050`

### Server compose

`docker-compose.server.yml` expects runtime env from `.env.runtime` and image tags via:

- `FRONTEND_IMAGE`
- `BACKEND_IMAGE`

## CI/CD (GitHub Actions)

- `ci.yml`: lint, typecheck, test, build on PR and pushes to `main`
- `commitlint.yml`: validates Conventional Commit messages on PR
- `deploy.yml`:
  - builds/pushes frontend and backend images to ECR
  - deploys to `dev`
  - deploys to `prod` (manual approval via protected GitHub Environment)

## AWS Deployment Plan (Implemented Scaffolding)

- Compute: EC2 hosts running Docker Compose (dev + prod)
- Registry: Amazon ECR
- Secrets: AWS Secrets Manager (JSON secret pulled at deploy time)
- Logs: app logs to stdout, collect with CloudWatch Agent
- DNS + TLS: Route53 + ACM + ALB

### Required GitHub Variables/Secrets

Repo/environment variables:

- `AWS_REGION`
- `ECR_REPOSITORY_FRONTEND`
- `ECR_REPOSITORY_BACKEND`

GitHub secrets:

- `AWS_ROLE_ARN`
- `DEV_HOST`, `DEV_SSH_USER`, `DEV_SSH_KEY`, `DEV_SECRETS_ID`
- `PROD_HOST`, `PROD_SSH_USER`, `PROD_SSH_KEY`, `PROD_SECRETS_ID`

## Deployment Script

`infra/scripts/deploy-compose.sh`:

1. Pulls secret JSON from Secrets Manager (`SECRETS_ID`)
2. Renders `.env.runtime`
3. Pulls target images
4. Runs `docker compose -f docker-compose.server.yml up -d --remove-orphans`

Dependencies on host:

- `aws` CLI
- `jq`
- Docker + Compose plugin

## Logging and Observability

- Structured JSON logs from backend
- Suggested CloudWatch setup:
  - log groups per environment
  - metric filter on `level=error`
  - alarms for 5xx and host health

## Git Workflow (Senior Standard)

### Branches

Use short-lived branches with prefix:

- `codex/feat/<scope>-<desc>`
- `codex/fix/<scope>-<desc>`
- `codex/ci/<scope>-<desc>`

### Conventional Commits

Format:

```text
<type>(<scope>): <imperative summary>
```

Examples:

- `feat(votes): add /api/votes/me endpoint`
- `feat(i18n): add english and spanish dictionaries`
- `ci(actions): add deployment workflow`

Supported types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `perf`, `build`.

### Optional Local Commit Hook

Enable repo hooks:

```bash
git config core.hooksPath .githooks
```

This activates `.githooks/commit-msg`, which runs commitlint locally.

## Security Notes

- Keep `ENABLE_DEV_AUTH_FALLBACK=false` in production.
- Use Clerk bearer token verification in production via JWKS.
- Rotate `ADMIN_API_KEY` and secrets regularly.
- Never commit real secrets to the repository.
