"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SAMPLE_JSON = `{
  "conferenceName": "ACC",
  "year": 2026,
  "timezone": "America/New_York",
  "firstGameStart": "2026-03-10T14:00:00-04:00",
  "teams": [
    { "seed": 1, "name": "Duke" },
    { "seed": 2, "name": "Virginia" },
    { "seed": 3, "name": "Miami" },
    { "seed": 4, "name": "North Carolina" },
    { "seed": 5, "name": "Clemson" },
    { "seed": 6, "name": "Louisville" },
    { "seed": 7, "name": "NC State" },
    { "seed": 8, "name": "Florida State" },
    { "seed": 9, "name": "California" },
    { "seed": 10, "name": "Stanford" },
    { "seed": 11, "name": "SMU" },
    { "seed": 12, "name": "Virginia Tech" },
    { "seed": 13, "name": "Wake Forest" },
    { "seed": 14, "name": "Syracuse" },
    { "seed": 15, "name": "Pitt" }
  ],
  "games": [
    {
      "gameNumber": 1,
      "round": 1,
      "position": 0,
      "startTime": "2026-03-10T14:00:00-04:00",
      "topTeamName": "Stanford",
      "bottomTeamName": "Pitt",
      "topSeedLabel": "#10 Stanford",
      "bottomSeedLabel": "#15 Pitt",
      "nextGameNumber": 4,
      "nextSlot": "bottom"
    },
    {
      "gameNumber": 2,
      "round": 1,
      "position": 1,
      "startTime": "2026-03-10T16:30:00-04:00",
      "topTeamName": "SMU",
      "bottomTeamName": "Syracuse",
      "topSeedLabel": "#11 SMU",
      "bottomSeedLabel": "#14 Syracuse",
      "nextGameNumber": 5,
      "nextSlot": "bottom"
    },
    {
      "gameNumber": 3,
      "round": 1,
      "position": 2,
      "startTime": "2026-03-10T19:00:00-04:00",
      "topTeamName": "Virginia Tech",
      "bottomTeamName": "Wake Forest",
      "topSeedLabel": "#12 Virginia Tech",
      "bottomSeedLabel": "#13 Wake Forest",
      "nextGameNumber": 7,
      "nextSlot": "bottom"
    },
    {
      "gameNumber": 4,
      "round": 2,
      "position": 0,
      "startTime": "2026-03-11T12:00:00-04:00",
      "topTeamName": "NC State",
      "topSeedLabel": "#7 NC State",
      "bottomSourceGameNumber": 1,
      "nextGameNumber": 8,
      "nextSlot": "bottom"
    },
    {
      "gameNumber": 5,
      "round": 2,
      "position": 1,
      "startTime": "2026-03-11T14:30:00-04:00",
      "topTeamName": "Louisville",
      "topSeedLabel": "#6 Louisville",
      "bottomSourceGameNumber": 2,
      "nextGameNumber": 9,
      "nextSlot": "bottom"
    },
    {
      "gameNumber": 6,
      "round": 2,
      "position": 2,
      "startTime": "2026-03-11T19:00:00-04:00",
      "topTeamName": "Florida State",
      "bottomTeamName": "California",
      "topSeedLabel": "#8 Florida State",
      "bottomSeedLabel": "#9 California",
      "nextGameNumber": 10,
      "nextSlot": "bottom"
    },
    {
      "gameNumber": 7,
      "round": 2,
      "position": 3,
      "startTime": "2026-03-11T21:30:00-04:00",
      "topTeamName": "Clemson",
      "topSeedLabel": "#5 Clemson",
      "bottomSourceGameNumber": 3,
      "nextGameNumber": 11,
      "nextSlot": "bottom"
    },
    {
      "gameNumber": 8,
      "round": 3,
      "position": 0,
      "startTime": "2026-03-12T12:00:00-04:00",
      "topTeamName": "Virginia",
      "topSeedLabel": "#2 Virginia",
      "bottomSourceGameNumber": 4,
      "nextGameNumber": 12,
      "nextSlot": "top"
    },
    {
      "gameNumber": 9,
      "round": 3,
      "position": 1,
      "startTime": "2026-03-12T14:30:00-04:00",
      "topTeamName": "Miami",
      "topSeedLabel": "#3 Miami",
      "bottomSourceGameNumber": 5,
      "nextGameNumber": 12,
      "nextSlot": "bottom"
    },
    {
      "gameNumber": 10,
      "round": 3,
      "position": 2,
      "startTime": "2026-03-12T19:00:00-04:00",
      "topTeamName": "Duke",
      "topSeedLabel": "#1 Duke",
      "bottomSourceGameNumber": 6,
      "nextGameNumber": 13,
      "nextSlot": "top"
    },
    {
      "gameNumber": 11,
      "round": 3,
      "position": 3,
      "startTime": "2026-03-12T21:30:00-04:00",
      "topTeamName": "North Carolina",
      "topSeedLabel": "#4 North Carolina",
      "bottomSourceGameNumber": 7,
      "nextGameNumber": 13,
      "nextSlot": "bottom"
    },
    {
      "gameNumber": 12,
      "round": 4,
      "position": 0,
      "startTime": "2026-03-13T19:00:00-04:00",
      "topSourceGameNumber": 8,
      "bottomSourceGameNumber": 9,
      "nextGameNumber": 14,
      "nextSlot": "top"
    },
    {
      "gameNumber": 13,
      "round": 4,
      "position": 1,
      "startTime": "2026-03-13T21:30:00-04:00",
      "topSourceGameNumber": 10,
      "bottomSourceGameNumber": 11,
      "nextGameNumber": 14,
      "nextSlot": "bottom"
    },
    {
      "gameNumber": 14,
      "round": 5,
      "position": 0,
      "startTime": "2026-03-14T20:30:00-04:00",
      "topSourceGameNumber": 12,
      "bottomSourceGameNumber": 13
    }
  ]
}`;

export default function ImportPage() {
  const [json, setJson] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleImport() {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const data = JSON.parse(json);
      const res = await fetch("/api/admin/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Import failed");
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/admin"), 1500);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    } finally {
      setLoading(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJson(ev.target?.result as string);
    };
    reader.readAsText(file);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Import Tournament</h1>

      <div className="space-y-6">
        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Upload JSON File
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {/* JSON editor */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Or paste JSON directly
          </label>
          <textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            rows={20}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Paste tournament JSON here..."
          />
        </div>

        {/* Load sample */}
        <button
          onClick={() => setJson(SAMPLE_JSON)}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Load sample JSON template
        </button>

        {/* Status */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">
            Tournament imported successfully! Redirecting...
          </div>
        )}

        {/* Import button */}
        <button
          onClick={handleImport}
          disabled={!json.trim() || loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {loading ? "Importing..." : "Import Tournament"}
        </button>
      </div>

      {/* Schema docs */}
      <div className="mt-12 bg-slate-50 rounded-xl p-6 border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">JSON Schema Reference</h2>
        <div className="text-sm text-slate-600 space-y-3">
          <p><strong>conferenceName</strong> (string, required): e.g., &quot;SEC&quot;, &quot;Big East&quot;</p>
          <p><strong>year</strong> (number, required): e.g., 2026</p>
          <p><strong>timezone</strong> (string): Default &quot;America/New_York&quot;</p>
          <p><strong>firstGameStart</strong> (ISO datetime, required): Lock time for picks</p>
          <p><strong>teams</strong> (array): Optional list of &#123; seed, name &#125;</p>
          <p><strong>games</strong> (array, required): List of game objects:</p>
          <ul className="ml-4 space-y-1 list-disc">
            <li><strong>gameNumber</strong>: Unique number within the tournament</li>
            <li><strong>round</strong>: Round number (1-based)</li>
            <li><strong>position</strong>: Position within the round (0-based)</li>
            <li><strong>startTime</strong>: ISO datetime (optional)</li>
            <li><strong>topTeamName / bottomTeamName</strong>: Team names for first-round games</li>
            <li><strong>topSeedLabel / bottomSeedLabel</strong>: Display labels</li>
            <li><strong>topSourceGameNumber / bottomSourceGameNumber</strong>: Which earlier game feeds this slot</li>
            <li><strong>nextGameNumber</strong>: Which game the winner advances to</li>
            <li><strong>nextSlot</strong>: &quot;top&quot; or &quot;bottom&quot;</li>
            <li><strong>isBye</strong>: true if this is a bye game (auto-advance)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
