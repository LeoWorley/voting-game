# Development Plan: "Big Brother" Style Voting Game

This plan describes the local-first web app for a weekly elimination game (Big Brother-like) to be used with coworkers, and the path to a hardened deployment.

---

## Language and Documentation Policy
- All code comments and documentation are in English.
- UI language: currently Spanish copy exists; standardize on English for now or introduce i18n (simple dictionary) when time permits.

---

## Game Rules and Mechanics

### Voting
- Each player casts 2 votes per session: Primary (2 pts) and Secondary (1 pt).
- Cannot vote for self. Primary and Secondary must target different users.
- Votes can be edited until the session closes.

### Tie-breakers
Deterministic, documented order:
1) Highest total points
2) Most primary (2-point) votes
3) Earliest final submission timestamp by the tied target (when the last vote affecting them was submitted)
4) Admin decision (recorded in audit log)

### Visibility
- Public (or all players): anonymized session results (scores per player, eliminated user).
- Admin-only: detailed results (who voted for whom with reasons).

---

## Phase 1: Backend (Node.js + Express + Mongoose) — IN PROGRESS

The backend manages game logic, data, and security.

### 1) Data Models — COMPLETED (current)

`User`
- `clerkId: String` — unique external ID
- `username: String`
- `imageUrl: String`
- `status: 'active' | 'eliminated'`
- `eliminationSession: ObjectId | null`

`VotingSession`
- `name: String`
- `startTime: Date`
- `endTime: Date`
- `isActive: Boolean`
- `eliminatedUser: ObjectId | null`

`Vote`
- `sessionId: ObjectId`
- `voterId: ObjectId`
- `votedForId: ObjectId`
- `points: 1 | 2`
- `reason: String`

Indexes — COMPLETED
- Unique: `(sessionId, voterId, points)` to ensure one vote per tier per session.
- Supportive: indexes on `Vote.sessionId`, `VotingSession.isActive`, `VotingSession.endTime`.

### 2) Authentication and Security
- Local-first: enable dev header `X-Dev-User-Id` via middleware. Controlled by `ENABLE_DEV_AUTH_FALLBACK=true` or non-production env.
- Clerk webhooks: route present; signature verification — TODO for production.
- Admin guard: `X-API-Key` required for admin endpoints (`ADMIN_API_KEY`).

### 3) API Endpoints — STATUS

Auth & Users
- `POST /api/users/sync` — Clerk webhook to upsert users. Status: implemented; signature verification — TODO.

Voting
- `GET /api/voting/status` — canonical contract to unify frontend/back:
  - Response: `{ isVotingOpen: boolean, startTime?: Date, endTime?: Date, sessionName?: string, eligiblePlayers: Array<{ id, username, imageUrl }>, me: { clerkId: string, isActive: boolean } }`
  - Status: implemented (currently returns `isVotingActive`, `startTime`, `endTime`, `sessionName`, `eligiblePlayers`). TODO: align naming and include `me`.
- `POST /api/votes` — submit primary (2 pts) and secondary (1 pt) votes; idempotent upsert per tier. Status: completed.
- `GET /api/votes/me?sessionId=current` — retrieve current user’s votes for the active session to support editing. Status: TODO.

Results
- `GET /api/results/latest` — latest closed session with eliminated user. Status: completed.
- `GET /api/results/aggregate/:sessionId` — anonymized counts per target (primary, secondary, total). Status: TODO.
- `GET /api/admin/detailed-results/:sessionId` — full vote details; `X-API-Key` protected. Status: completed.

Session Lifecycle (admin)
- `POST /api/admin/sessions/open` — create/open a new session. Status: TODO.
- `POST /api/admin/sessions/close-and-eliminate` — close active session, compute totals with tie-breakers, set eliminated user, mark users, open next session (optional). Status: TODO.
- `GET /api/sessions/history` — list sessions with eliminated user. Status: TODO.

### 4) Operational Concerns
- CORS for local dev: allow `http://localhost:3000`. Status: TODO.
- Transactions: optional MongoDB transaction wrapping dual upserts for strict atomicity; current unique-index approach is acceptable locally. Status: optional/TODO.
- Audit log: record admin actions (session open/close, manual tie-break). Status: TODO.

---

## Phase 2: Frontend (Next.js + React) — PLANNED

Pages & Components
- Auth (`/sign-in`, `/sign-up`) — maintain Clerk for now; support dev-mode header in API client for local.
- Dashboard (`/dashboard`)
  - Calls `GET /api/voting/status`.
  - If open and user active: show voting form with eligible players; pre-fill current votes via `GET /api/votes/me` to allow edit.
  - If closed: show latest results and link to history.
- Results (`/results`) — history of sessions with eliminated players and aggregate scores.
- Admin (local) (`/admin`) — minimal controls: open session, close+eliminate (runs the algorithm), view aggregates.

UX Notes
- Disable form for eliminated users or when window closed.
- Reasons are optional; display where appropriate.
- Language consistency: keep UI copy in English (or add i18n switch if needed).

---

## Phase 3: Automation — PLANNED

Start manual, then automate.

Manual-first
- Admin triggers `close-and-eliminate` weekly; the endpoint computes totals, applies tie-breakers, marks elimination, and optionally opens the next session.

Cron (later)
- Weekly schedule (e.g., Saturday 22:00 in a chosen timezone) to run the same logic as the manual endpoint. Ensure idempotency (safe re-runs).

---

## Security and Constraints Checklist

- Clerk authentication on routes — Completed (middleware; dev fallback via `X-Dev-User-Id`).
- Frontend sends dev header locally — Completed.
- Admin protection for detailed results — Completed (`X-API-Key`).
- Verify Clerk webhook signatures — TODO (`/api/users/sync`).
- Enforce voting constraints server-side — Completed (active window; primary+secondary; distinct targets; no self; targets active; upsert policy and unique index).
- Indexes — Completed (unique and supportive indexes in place).
- CORS for local dev — TODO.

Auth Hardening for Prod
- Replace dev fallback with verified Clerk auth (@clerk/express or JWKS verification).
- Frontend uses real `Authorization: Bearer` token instead of dev header in prod.

---

## Observability and Auditing — PLANNED
- Structured logs for vote submissions, session open/close, and admin actions.
- Minimal `audits` collection: `{ actor, action, target, metadata, createdAt }`.

---

## Testing Plan — PLANNED
- Unit tests: vote constraints (no self, unique tiers, active targets), status endpoint contract, tie-breaker function.
- Integration test: end-to-end session close-and-eliminate with deterministic tie cases.
- Seeded local data for reproducible smoke tests.

---

## Documentation & DevX — PLANNED
- README updates:
  - Add envs: `ADMIN_API_KEY`, `ENABLE_DEV_AUTH_FALLBACK=true`.
  - Local quickstart: seed users, open session, submit votes, close session, view results.
  - Note CORS setup for local.
- Remove or implement Socket.IO reference (keep only if realtime UI planned).

---

## Future Considerations
- Add role on `User` for richer admin controls when Clerk is fully integrated.
- Realtime updates (Socket.IO or SSE) on results or session status.
- i18n support for bilingual teams.
- Export reports per session (CSV or JSON) for retrospectives.
