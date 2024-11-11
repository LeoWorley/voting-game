# Voting Game

A voting elimination game application built with Next.js, Express, and MongoDB.

## Prerequisites

- Node.js 16.x or higher
- MongoDB database (local or Atlas)
- npm or yarn package manager

## Project Structure

```
.
├── frontend/   # Next.js frontend application
├── backend/    # Express backend server
└── package.json # Root package.json for workspace management
```

## Setup

1. Clone the repository:
    ```sh
    git clone <repository-url>
    cd voting-game
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

3. Configure environment variables:

    **Backend (.env in backend folder):**
    ```
    PORT=3001
    MONGODB_URI=your_mongodb_uri
    NODE_ENV=development
    ```

    **Frontend (.env.local in frontend folder):**
    ```
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
    CLERK_SECRET_KEY=your_clerk_secret_key
    NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
    ```

4. Initialize the database:
    ```sh
    cd backend
    npm run seed
    ```

## Development

Run both frontend and backend in development mode:
```sh
npm run dev
```

Or run them separately:

**Frontend only:**
```sh
npm run dev:frontend
```

**Backend only:**
```sh
npm run dev:backend
```

The frontend will be available at [http://localhost:3000](http://localhost:3000)  
The backend API will be available at [http://localhost:3001](http://localhost:3001)

## Building for Production

Build the frontend:
```sh
npm run build
```

## Starting in Production

Start the backend server:
```sh
npm run start
```

## Technologies Used

**Frontend:**
- Next.js 15.0
- React 19.0
- Tailwind CSS
- Clerk Authentication
- TypeScript

**Backend:**
- Express
- MongoDB/Mongoose
- Socket.IO
- Node.js
