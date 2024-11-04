import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Voting Game</h1>
        <div>
          {userId ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
            <div className="space-x-4">
              <Link 
                href="/sign-in"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Sign In
              </Link>
              <Link 
                href="/sign-up"
                className="px-4 py-2 border border-blue-500 text-blue-500 rounded hover:bg-blue-50"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        {userId ? (
          <div className="text-center">
            <h2 className="text-xl mb-4">Welcome to the Voting Game!</h2>
            <Link 
              href="/dashboard"
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-xl mb-4">Please sign in to participate in the game</h2>
          </div>
        )}
      </main>
    </div>
  );
}
