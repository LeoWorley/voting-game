# Development Plan: "Big Brother" Style Voting Game

This document outlines the development plan for a weekly voting game inspired by "Big Brother".

---

## Language and Documentation Policy
All instructions within this plan, as well as all code comments and documentation throughout the project, must be written in English.

---

## Phase 1: Backend (Node.js with Mongoose) - IN PROGRESS

The backend will manage the game logic, data, and security.

### 1. Data Models (MongoDB/Mongoose) - IN PROGRESS

The following schemas will be defined to store information in the database.

#### `User`
Represents each player in the game, integrating with Clerk for authentication and tracking their status.

-   `clerkId`: `String` - Unique ID from Clerk. Serves as the primary identifier for linking with the auth provider.
-   `username`: `String` - Player's display name.
-   `imageUrl`: `String` - URL for the profile picture.
-   `status`: `String` - Current status within the game. Can be `'active'` or `'eliminated'`.
-   `eliminationSession`: `ObjectId` - Reference to the `VotingSession` where the user was eliminated. Null if active.

#### `VotingSession`
Represents a weekly voting cycle.

-   `name`: `String` - A descriptive name for the session (e.g., "Week 1", "Week 2").
-   `startTime`: `Date` - The exact date and time when voting opens.
-   `endTime`: `Date` - The exact date and time when voting closes.
-   `isActive`: `Boolean` - A flag to quickly identify if the session is currently open for voting.
-   `eliminatedUser`: `ObjectId` - Reference to the `User` who was eliminated at the end of this session.

#### `Vote`
Represents an individual vote cast by one user for another during a specific session.

-   `sessionId`: `ObjectId` - Reference to the `VotingSession` this vote belongs to.
-   `voterId`: `ObjectId` - Reference to the `User` who cast the vote.
-   `votedForId`: `ObjectId` - Reference to the `User` who received the vote.
-   `points`: `Number` - The value of the vote, either `2` (primary) or `1` (secondary).
-   `reason`: `String` - The justification provided by the voter.

### 2. API Endpoints (Express.js) - COMPLETED

The following endpoints will be created for communication between the frontend and backend.

#### Authentication and Users
-   **`POST /api/users/sync`**
    -   **Description:** Receives a webhook from Clerk to create or update users in the local database when they sign up or modify their profile.
    -   **Protection:** Clerk Webhook.

#### Voting
-   **`GET /api/voting/status`**
    -   **Description:** Returns the status of the current voting session (active/inactive), start/end dates, and the list of eligible users (`status: 'active'`).
    -   **Protection:** Requires user authentication.

-   **`POST /api/votes`**
    -   **Description:** Allows an authenticated and active user to cast their two votes (primary and secondary).
    -   **Payload:** `{ primaryVote: { userId, reason }, secondaryVote: { userId, reason } }`
    -   **Protection:** Requires user authentication.

#### Results and Backdoor
-   **`GET /api/results/latest`**
    -   **Description:** Returns the anonymous results of the last closed voting session.
    -   **Protection:** Public or requires user authentication.

-   **`GET /api/admin/detailed-results/:sessionId`**
    -   **Description:** **(Backdoor)** Returns all vote details for a session, including `voterId`.
    -   **Protection:** Requires an admin role or a secret API key.

---

## Phase 2: Frontend (Next.js with React)

The frontend will be the interface that users interact with.

### 1. Pages and Components

-   **Authentication (`/sign-in`, `/sign-up`)**
    -   The existing integration with Clerk will be maintained.

-   **Dashboard (`/dashboard`)**
    -   Calls `GET /api/voting/status` on load.
    -   **If voting is active:**
        -   Displays a form to select two users and write the reasons.
        -   The form is disabled if the current user is eliminated (`status: 'eliminated'`).
        -   On submit, it calls `POST /api/votes`.
    -   **If voting is closed:**
        -   Displays an informational message and the results of the last round.

-   **Results Page (`/results`)**
    -   Displays a history of past voting sessions, showing who was eliminated in each one.

---

## Phase 3: Automation (Cron Job)

An automated process will manage the weekly voting cycle.

### 1. Weekly Script (`node-cron` or similar)

-   **Trigger:** Runs weekly at a predefined time (e.g., Saturday at 10:00 PM).
-   **Logic:**
    1.  Closes the current voting session (`isActive: false`).
    2.  Calculates the total points for each user voted for in that session.
    3.  Identifies the user with the highest score.
    4.  Updates the user's `status` to `'eliminated'`.
    5.  Stores the eliminated user's ID in the current `VotingSession`.
    6.  Creates a new `VotingSession` for the following week, marking it as `isActive: true`.

---

## Future Considerations and Plan Maintenance

This document is a living guide. Any new technical considerations, optimizations, or ideas that arise during development and are not immediately implemented should be recorded in this section for future reference.

-   **Database Optimization:** Add indexes to frequently queried fields (e.g., `clerkId` on `User`, `sessionId` on `Vote`) to improve performance.
-   **Voting Constraints:** Ensure vote uniqueness. A `voterId` can only submit one 2-point vote and one 1-point vote per `sessionId`. This must be handled in the application logic.
