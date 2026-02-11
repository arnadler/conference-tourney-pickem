"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <nav className="bg-slate-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold tracking-tight">
              🏀 Pick&apos;Em
            </Link>
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <Link href="/" className="hover:text-blue-300 transition-colors">
                Tournaments
              </Link>
              <Link href="/standings" className="hover:text-blue-300 transition-colors">
                Standings
              </Link>
              {session && (
                <Link href="/my-picks" className="hover:text-blue-300 transition-colors">
                  My Picks
                </Link>
              )}
              {Boolean((session?.user as Record<string, unknown>)?.isAdmin) && (
                <Link href="/admin" className="hover:text-blue-300 transition-colors text-yellow-300">
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {status === "loading" ? (
              <span className="text-slate-400">Loading...</span>
            ) : session ? (
              <>
                <span className="text-slate-300">{session.user?.name || session.user?.email}</span>
                <button
                  onClick={() => signOut()}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
