"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // In dev, use credentials provider. In prod, use email magic link.
    try {
      const result = await signIn("credentials", {
        email,
        callbackUrl,
        redirect: true,
      });
    } catch {
      // Fallback to email provider
      await signIn("email", { email, callbackUrl });
      setSent(true);
    }

    setLoading(false);
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <h1 className="text-2xl font-bold mb-4">Check your email</h1>
          <p className="text-slate-600">
            We sent a magic link to <strong>{email}</strong>. Click the link to sign in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="bg-white rounded-xl border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Sign In</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="mt-4 text-xs text-center text-slate-400">
          Dev mode: any email will create/login instantly.
          <br />
          Use <strong>admin@example.com</strong> for admin access.
        </p>
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
