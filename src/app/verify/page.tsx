"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyForm() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const email = searchParams.get("email");

  if (!url) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <p className="text-slate-600">Invalid sign-in link. Please request a new one.</p>
      </div>
    );
  }

  function handleSignIn() {
    // Hard navigation so the browser processes NextAuth's Set-Cookie header
    window.location.href = url!;
  }

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Sign In</h1>
        <p className="text-slate-600 mb-6">
          Click the button below to sign in{email ? ` as ${email}` : ""}.
        </p>
        <button
          onClick={handleSignIn}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition-colors"
        >
          Complete Sign In
        </button>
        <p className="mt-4 text-xs text-slate-400">
          This link expires in 24 hours. If you didn&apos;t request this, ignore it.
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto mt-20 text-center text-slate-500">Loading...</div>}>
      <VerifyForm />
    </Suspense>
  );
}
