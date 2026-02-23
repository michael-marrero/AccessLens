"use client";

import { useMemo, useState } from "react";
import { safeJsonStringify } from "@/lib/findings/format";
import type { FindingWorkspaceDetail } from "@/lib/findings/queries";

type EvidenceTab = "events" | "entitlements" | "ruleEvidence" | "raw";

type Props = {
  detail: FindingWorkspaceDetail;
};

function TabButton({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? "rounded-md bg-brand-100 px-3 py-2 text-xs font-semibold text-brand-800"
          : "rounded-md px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
      }
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function FindingEvidenceCard({ detail }: Props) {
  const [tab, setTab] = useState<EvidenceTab>("events");

  const rawPayload = useMemo(
    () => ({
      finding: detail.finding,
      evidence: detail.finding.evidence
    }),
    [detail.finding]
  );

  const copyRawJson = async () => {
    try {
      await navigator.clipboard.writeText(safeJsonStringify(rawPayload));
    } catch {
      // ignore clipboard failure
    }
  };

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-950">Evidence</h3>
        <div className="flex flex-wrap gap-1 rounded-md bg-slate-100 p-1">
          <TabButton active={tab === "events"} label="Events" onClick={() => setTab("events")} />
          <TabButton active={tab === "entitlements"} label="Entitlements" onClick={() => setTab("entitlements")} />
          <TabButton active={tab === "ruleEvidence"} label="Rule Evidence" onClick={() => setTab("ruleEvidence")} />
          <TabButton active={tab === "raw"} label="Raw JSON" onClick={() => setTab("raw")} />
        </div>
      </div>

      {tab === "events" ? (
        <div className="mt-3 overflow-x-auto">
          {detail.recentEvents.length === 0 ? (
            <p className="text-sm text-slate-500">No recent access events found for this identity.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Event Type</th>
                  <th className="py-2 pr-4">Application</th>
                  <th className="py-2 pr-4">Country</th>
                  <th className="py-2 pr-4">IP</th>
                  <th className="py-2 pr-4">Success</th>
                  <th className="py-2">Metadata</th>
                </tr>
              </thead>
              <tbody>
                {detail.recentEvents.map((event) => (
                  <tr key={event.id} className="border-t border-slate-200 align-top">
                    <td className="py-2 pr-4">{new Date(event.ts).toLocaleString()}</td>
                    <td className="py-2 pr-4">{event.event_type}</td>
                    <td className="py-2 pr-4">{event.application_name ?? "N/A"}</td>
                    <td className="py-2 pr-4">{event.country}</td>
                    <td className="py-2 pr-4">{event.ip_address}</td>
                    <td className="py-2 pr-4">{event.success ? "Yes" : "No"}</td>
                    <td className="py-2">
                      <details>
                        <summary className="cursor-pointer text-xs text-brand-700">View</summary>
                        <pre className="mt-1 max-w-xs overflow-auto rounded bg-slate-950 p-2 text-xs text-slate-100">
                          {safeJsonStringify(event.metadata)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {tab === "entitlements" ? (
        <div className="mt-3 overflow-x-auto">
          {detail.entitlements.length === 0 ? (
            <p className="text-sm text-slate-500">No entitlements are currently granted for this identity.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Entitlement</th>
                  <th className="py-2 pr-4">Privilege Weight</th>
                  <th className="py-2 pr-4">Granted At</th>
                  <th className="py-2">Granted By</th>
                </tr>
              </thead>
              <tbody>
                {detail.entitlements.map((entitlement) => (
                  <tr key={entitlement.id} className="border-t border-slate-200">
                    <td className="py-2 pr-4 font-medium text-slate-800">{entitlement.name}</td>
                    <td className="py-2 pr-4">
                      {entitlement.privilege_weight}
                      {entitlement.privilege_weight >= 50 ? (
                        <span className="ml-2 badge bg-red-100 text-red-700">High</span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-4">{new Date(entitlement.granted_at).toLocaleString()}</td>
                    <td className="py-2">{entitlement.granted_by_name ?? "Unknown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {tab === "ruleEvidence" ? (
        <div className="mt-3 space-y-3 text-sm text-slate-700">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Detector Version</p>
              <p className="mt-1 font-medium text-slate-900">{detail.finding.detector_version ?? "Not available"}</p>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Confidence</p>
              <p className="mt-1 font-medium text-slate-900">
                {detail.finding.confidence !== null ? `${Math.round(detail.finding.confidence * 100)}%` : "Not available"}
              </p>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Rule IDs</p>
            {detail.finding.rule_ids?.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {detail.finding.rule_ids.map((ruleId) => (
                  <span key={ruleId} className="badge bg-slate-100 text-slate-700">
                    {ruleId}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-slate-500">No rule IDs stored for this finding.</p>
            )}
          </div>

          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Evidence References</p>
            {Object.keys(detail.finding.evidence).length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {Object.entries(detail.finding.evidence).map(([key, value]) => (
                  <li key={key}>
                    <span className="font-medium">{key}</span>: {typeof value === "string" ? value : "structured value"}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-slate-500">No explicit evidence keys are present.</p>
            )}
          </div>
        </div>
      ) : null}

      {tab === "raw" ? (
        <div className="mt-3 space-y-3">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => {
              void copyRawJson();
            }}
          >
            Copy JSON
          </button>
          <details open>
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">Finding and Evidence Payload</summary>
            <pre className="mt-2 overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
              {safeJsonStringify(rawPayload)}
            </pre>
          </details>
        </div>
      ) : null}
    </section>
  );
}
