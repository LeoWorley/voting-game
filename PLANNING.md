# Development Plan: "Big Brother" Style Voting Game

This document outlines the development plan for a weekly voting game inspired by "Big Brother".

---

## Phase 1: Backend (Node.js with Mongoose)

The backend will manage the game logic, data, and security.

### 1. Data Models (MongoDB/Mongoose)

The following schemas will be defined to store information in the database.

#### `User`
Represents each player in the game.

-   `clerkId`: `String` - Unique ID from Clerk for authentication.
-   `username`: `String` - User's name.
-   `imageUrl`: `String` - URL for the profile picture.
-   `status`: `String` - User's status (`'active'`, `'eliminated'`). Default: `'active'`.

#### `VotingSession`
Represents a weekly voting cycle.

-   `startTime`: `Date` - Start date and time for voting.
-   `endTime`: `Date` - End date and time for voting.
-   `isActive`: `Boolean` - Indicates if the session is currently open.
-   `eliminatedUser`: `ObjectId` - Reference to the `User` eliminated in this session.

#### `Vote`
Represents an individual vote cast by a user.

-   `sessionId`: `ObjectId` - Reference to the `VotingSession`.
-   `voterId`: `ObjectId` - Reference to the `User` who is voting. **(Admin backdoor)**.
-   `votedForId`: `ObjectId` - Reference to the `User` receiving the vote.
-   `points`: `Number` - `2` for the primary vote, `1` for the secondary vote.
-   `reason`: `String` - Justification for the vote.

### 2. API Endpoints (Express.js)

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
