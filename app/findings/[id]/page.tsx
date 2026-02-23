"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { authFetch } from "@/lib/http-client";
import type { FindingSeverity, FindingStatus, ReviewAction } from "@/lib/types";
import { SeverityBadge } from "@/components/severity-badge";
import { StatusBadge } from "@/components/status-badge";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type FindingDetail = {
  id: string;
  finding_type: string;
  severity: FindingSeverity;
  score: number;
  status: FindingStatus;
  explanation: string;
  evidence: Record<string, unknown>;
  created_at: string;
  identity: { name: string; email: string | null; type: string } | null;
  application: { name: string; category: string } | null;
  ai: {
    recommendation: ReviewAction;
    confidence: number | null;
    rationale: string[];
  };
  actions: Array<{
    id: string;
    action: ReviewAction;
    note: string | null;
    created_at: string;
    actor: { full_name: string; role: string };
  }>;
};

export default function FindingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const [finding, setFinding] = useState<FindingDetail | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const findingId = params.id;

  const loadFinding = async () => {
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
      const data = await authFetch<{ finding: FindingDetail }>(`/api/findings/${findingId}`);
      setFinding(data.finding);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load finding");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFinding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findingId]);

  const submitAction = async (action: ReviewAction) => {
    setIsSubmitting(true);
    setError(null);

    try {
      await authFetch(`/api/findings/${findingId}/action`, {
        method: "POST",
        body: JSON.stringify({ action, note })
      });
      setNote("");
      await loadFinding();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit action");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="card text-sm text-slate-600">Loading finding details...</div>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        <Link href="/dashboard">Back to dashboard</Link>
      </div>
    );
  }

  if (!finding) {
    return <div className="card text-sm text-slate-600">Finding not found.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <Link className="text-sm" href="/dashboard">
          ← Back to dashboard
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-slate-950">{finding.finding_type}</h2>
          <SeverityBadge severity={finding.severity} />
          <StatusBadge status={finding.status} />
          <span className="badge bg-slate-100 text-slate-700">Score {finding.score.toFixed(1)}</span>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Identity: <span className="font-medium text-slate-900">{finding.identity?.name ?? "Unknown"}</span>
          {" · "}
          App: <span className="font-medium text-slate-900">{finding.application?.name ?? "N/A"}</span>
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card">
          <h3 className="text-lg font-semibold">AI Explanation</h3>
          <p className="mt-2 text-sm text-slate-700">{finding.explanation}</p>
          <div className="mt-4 rounded-md bg-brand-50 p-3 text-sm text-brand-900">
            Recommended action: <span className="font-semibold uppercase">{finding.ai.recommendation}</span>
            {finding.ai.confidence !== null ? ` (confidence ${Math.round(finding.ai.confidence * 100)}%)` : ""}
          </div>
          {finding.ai.rationale.length ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {finding.ai.rationale.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="card">
          <h3 className="text-lg font-semibold">Evidence</h3>
          <pre className="mt-2 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">
            {JSON.stringify(finding.evidence, null, 2)}
          </pre>
        </section>
      </div>

      <section className="card">
        <h3 className="text-lg font-semibold">Review Action</h3>
        <textarea
          className="mt-3 w-full rounded-md border border-slate-300 p-3 text-sm"
          rows={3}
          placeholder="Optional analyst note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            disabled={isSubmitting}
            onClick={() => submitAction("approve")}
          >
            Approve
          </button>
          <button
            className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            disabled={isSubmitting}
            onClick={() => submitAction("revoke")}
          >
            Revoke
          </button>
          <button
            className="rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            disabled={isSubmitting}
            onClick={() => submitAction("investigate")}
          >
            Investigate
          </button>
        </div>
      </section>

      <section className="card">
        <h3 className="text-lg font-semibold">Audit Trail</h3>
        {finding.actions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No review actions yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {finding.actions.map((action) => (
              <li key={action.id} className="rounded-md border border-slate-200 p-3 text-sm">
                <p className="font-medium uppercase text-slate-900">{action.action}</p>
                <p className="text-slate-600">
                  {action.actor.full_name} ({action.actor.role}) at {new Date(action.created_at).toLocaleString()}
                </p>
                {action.note ? <p className="mt-1 text-slate-700">{action.note}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
