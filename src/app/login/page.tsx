"use client";

import { useActionState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction } from "./actions";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [error, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="bg-white rounded-xl border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Sign In</h1>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Signing in..." : "Sign In"}
          </button>
        </form>
        {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto mt-20 text-center text-slate-500">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
