"use client";

import { useState } from "react";
import { sendStandingsEmail } from "./sendEmailAction";

export default function SendEmailButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleClick() {
    if (!confirm("Send a Day 2 recap email to all players?")) return;
    setStatus("loading");
    setMessage(null);
    setPreview(null);

    const result = await sendStandingsEmail();
    if (result.success) {
      setStatus("success");
      setMessage(`Sent to ${result.sent} player${result.sent === 1 ? "" : "s"}.`);
      setPreview(result.preview ?? null);
    } else {
      setStatus("error");
      setMessage(result.error ?? "Unknown error");
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleClick}
        disabled={status === "loading"}
        className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-400 disabled:opacity-50 transition-colors"
      >
        {status === "loading" ? "Generating & sending..." : "📧 Send Day 2 Recap Email"}
      </button>
      {status === "success" && message && (
        <p className="text-sm text-green-600 font-medium">{message}</p>
      )}
      {status === "error" && message && (
        <p className="text-sm text-red-600">{message}</p>
      )}
      {preview && (
        <div className="mt-2 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 whitespace-pre-line max-w-xl">
          <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Email preview</p>
          {preview}
        </div>
      )}
    </div>
  );
}
