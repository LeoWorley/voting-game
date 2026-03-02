# Voting Game Execution Checklist

This file tracks implementation progress for the full scope (product + infrastructure) with bilingual support and senior git workflow.

## Scope

- Gameplay and session lifecycle completion
- Canonical backend API contracts
- English + Spanish localization
- Frontend dashboard/admin completion
- Automated quality gates (lint/typecheck/test/build)
- Docker + AWS CI/CD scaffolding
- Secrets/logging/domain+HTTPS deployment plan
- Conventional commits + branch policy enforcement

## Milestones

### 1) Baseline Stabilization

Status: ✅ Completed

- Removed stale duplicate frontend component path that broke builds.
- Normalized API client behavior and contract types.
- Added backend CORS configuration with `ALLOWED_ORIGINS`.
- Restored green local pipeline for lint/type/test/build.

Acceptance gate:

- `npm run ci` passes locally.

### 2) Backend Feature Completion

Status: ✅ Completed

Implemented endpoints:

- `GET /api/voting/status`
- `POST /api/votes`
- `GET /api/votes/me`
- `GET /api/results/latest`
- `GET /api/results/aggregate/:sessionId`
- `GET /api/sessions/history`
- `GET /api/admin/detailed-results/:sessionId`
- `POST /api/admin/sessions/open`
- `POST /api/admin/sessions/close-and-eliminate`

Implemented server-side rules:

- no self-voting
- primary/secondary must differ
- active voter + active targets only
- vote editing via upsert while session is open
- deterministic tie-break flow with manual admin fallback

Added:

- `AuditLog` model
- centralized `game.service`
- standardized backend errors: `{ code, message, details? }`

### 3) Canonical API Contracts

Status: ✅ Completed

Canonical payloads now include:

- status: `isVotingOpen`, `session`, `eligiblePlayers`, `me`, `stats`
- my votes: `primaryVote`, `secondaryVote`
- latest and aggregate results with scoreboard rows
- admin lifecycle responses with tie-break metadata

### 4) Multilingual (`en` + `es`)

Status: ✅ Completed

- Added i18n dictionaries and typed key system.
- Added global language switcher.
- Persisted locale in localStorage + cookie.
- Localized dashboard, home, voting form, results, admin panel.
- Backend remains language-agnostic with stable error codes for frontend mapping.

### 5) Frontend Completion

Status: ✅ Completed

- Dashboard now supports:
  - canonical status contract
  - editable votes with preload
  - open/closed rendering
  - history rendering
- Added `/admin` page with:
  - API key input
  - open-session action
  - close-and-eliminate action
  - optional open-next-session payload
  - detailed vote retrieval per session

### 6) Testing + Quality Gates

Status: ✅ Completed

Backend:

- Jest + Supertest + mongodb-memory-server integration tests

Frontend:

- Vitest unit test coverage started for i18n/dictionary behavior

CI gate command:

- `npm run ci`

### 7) Dockerization

Status: ✅ Completed

- Added `backend/Dockerfile`
- Added `frontend/Dockerfile`
- Added `docker-compose.yml` for local
- Added `docker-compose.server.yml` for EC2 runtime

### 8) AWS CI/CD

Status: ✅ Completed (scaffold)

Added workflows:

- `.github/workflows/ci.yml`
- `.github/workflows/commitlint.yml`
- `.github/workflows/deploy.yml`

Deployment flow:

- Build/push images to ECR
- Deploy to `dev`
- Deploy to `prod` (via GitHub Environment approval)

### 9) Secrets, Logs, Domain, HTTPS

Status: ✅ Completed (runbook + scaffolding)

- Added `infra/scripts/deploy-compose.sh` to pull runtime secrets from AWS Secrets Manager.
- Backend logs are structured JSON to stdout (CloudWatch-ready).
- Route53 + ACM + ALB approach documented in README.

### 10) Documentation and Workflow Policy

Status: ✅ Completed

- Updated README with full local/devops runbook.
- Added Conventional Commit enforcement in CI.
- Added local optional commit hook and branching policy guidance.

## Remaining Manual Infrastructure Tasks

These are intentionally manual for this phase (no Terraform):

- Provision ECR repos (frontend/backend).
- Provision EC2 hosts and install Docker + AWS CLI + jq.
- Configure IAM/OIDC role for GitHub Actions.
- Create AWS Secrets Manager entries (`dev`/`prod`).
- Configure Route53 records and ACM certificates.
- Configure ALB listeners + target groups + HTTPS redirect.
- Add CloudWatch agent and alarms.
- Configure GitHub environments (`dev`, `prod`) and required approvals.

## Acceptance Criteria Snapshot

- Vote constraints enforced server-side.
- Editable votes supported by `GET /api/votes/me`.
- Tie-break logic deterministic with manual fallback path.
- Admin routes protected by `X-API-Key`.
- Public results do not expose per-voter mappings.
- Language switching works and persists.
- CI gate (`lint`, `typecheck`, `test`, `build`) is green.
- Docker and deployment workflows are present and documented.
