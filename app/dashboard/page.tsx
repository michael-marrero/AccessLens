"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/http-client";
import type { FindingSeverity, FindingStatus } from "@/lib/types";
import { SeverityBadge } from "@/components/findings/severity-badge";
import { StatusBadge } from "@/components/findings/status-badge";
import { EmptyState } from "@/components/empty-state";
import { FindingTypeLabel } from "@/components/findings/finding-type-label";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type FindingRow = {
  id: string;
  finding_type: string;
  severity: FindingSeverity;
  status: FindingStatus;
  score: number;
  created_at: string;
  identity: { name: string; email: string | null; type: string } | null;
  application: { name: string } | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const [findings, setFindings] = useState<FindingRow[]>([]);
  const [status, setStatus] = useState<string>("");
  const [severity, setSeverity] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [identityId, setIdentityId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    const identityCandidate = identityId.trim();
    if (status) params.set("status", status);
    if (severity) params.set("severity", severity);
    if (type.trim()) params.set("type", type.trim());
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identityCandidate)) {
      params.set("identityId", identityCandidate);
    }
    return params.toString();
  }, [identityId, severity, status, type]);

  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search).get("identityId");
    if (fromQuery) {
      setIdentityId(fromQuery);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);

      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      try {
        const data = await authFetch<{ findings: FindingRow[] }>(`/api/findings${query ? `?${query}` : ""}`);
        setFindings(data.findings);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load findings");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [query, router, supabase.auth]);

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-lg font-semibold">Risk Findings Dashboard</h2>
        <p className="text-sm text-slate-600">Filter by status, severity, and finding type.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_review">In Review</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
            <option value="suppressed">Suppressed</option>
            <option value="false_positive">False Positive</option>
            <option value="reviewed">Reviewed (legacy)</option>
          </select>

          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
          >
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Finding type"
            value={type}
            onChange={(event) => setType(event.target.value)}
          />

          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Identity ID"
            value={identityId}
            onChange={(event) => setIdentityId(event.target.value)}
          />

          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            onClick={() => {
              setStatus("");
              setSeverity("");
              setType("");
              setIdentityId("");
            }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {isLoading ? (
        <div className="card text-sm text-slate-600">Loading findings...</div>
      ) : findings.length === 0 ? (
        <EmptyState title="No findings" detail="No findings match the current filters." />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Identity</th>
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((finding) => (
                <tr key={finding.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <SeverityBadge severity={finding.severity} />
                  </td>
                  <td className="px-4 py-3">
                    <Link className="font-medium" href={`/findings/${finding.id}` as Route}>
                      <FindingTypeLabel findingType={finding.finding_type} />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={finding.status} />
                  </td>
                  <td className="px-4 py-3">{finding.identity?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3">{finding.application?.name ?? "-"}</td>
                  <td className="px-4 py-3">{finding.score.toFixed(1)}</td>
                  <td className="px-4 py-3">{new Date(finding.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
