"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/http-client";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export default function AdminPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);

  useEffect(() => {
    const load = async () => {
      setError(null);
      setIsLoading(true);

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      try {
        const data = await authFetch<{ role: string; fullName: string }>("/api/me");
        setIsAdmin(data.role === "admin");
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [router, supabase.auth]);

  const runRecompute = async () => {
    setIsWorking(true);
    setError(null);
    setMessage(null);

    try {
      const data = await authFetch<{ inserted: number }>("/api/risk/recompute", {
        method: "POST",
        body: JSON.stringify({})
      });
      setMessage(`Risk recompute completed. Inserted ${data.inserted} open findings.`);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Risk recompute failed");
    } finally {
      setIsWorking(false);
    }
  };

  const runSeedReset = async () => {
    setIsWorking(true);
    setError(null);
    setMessage(null);

    try {
      const data = await authFetch<{ findingsInserted: number }>("/api/admin/seed-reset", {
        method: "POST",
        body: JSON.stringify({})
      });
      setMessage(`Demo data reset complete. Inserted ${data.findingsInserted} findings.`);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Demo reset failed");
    } finally {
      setIsWorking(false);
    }
  };

  const canShowSeedButton = process.env.NODE_ENV !== "production";

  if (isLoading) {
    return <div className="card text-sm text-slate-600">Loading admin tools...</div>;
  }

  if (!isAdmin) {
    return <div className="card text-sm text-slate-700">Admin role is required to access this page.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-lg font-semibold">Admin Controls</h2>
        <p className="mt-1 text-sm text-slate-600">Run risk recomputation and reset demo datasets for development.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={runRecompute}
            disabled={isWorking}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Recompute Risks
          </button>

          {canShowSeedButton ? (
            <button
              type="button"
              onClick={runSeedReset}
              disabled={isWorking}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Seed / Reset Demo Data
            </button>
          ) : null}
        </div>
      </div>

      {message ? <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
