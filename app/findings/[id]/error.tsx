"use client";

import Link from "next/link";

export default function FindingDetailError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card space-y-3">
      <h2 className="text-lg font-semibold text-slate-950">Unable to load finding workspace</h2>
      <p className="text-sm text-slate-600">
        The finding details could not be loaded right now. Try again, or return to the dashboard.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          onClick={() => reset()}
        >
          Retry
        </button>
        <Link
          href="/dashboard"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back To Dashboard
        </Link>
      </div>
    </div>
  );
}
