import { deriveRecommendation, deriveTopSignals, deriveWhyThisFired, safeJsonStringify } from "@/lib/findings/format";
import type { FindingWorkspaceDetail } from "@/lib/findings/queries";

type Props = {
  finding: FindingWorkspaceDetail["finding"];
  ai: FindingWorkspaceDetail["ai"];
};

export function FindingSummaryCard({ finding, ai }: Props) {
  const whyThisFired = deriveWhyThisFired(finding.finding_type, finding.explanation);
  const recommendation = deriveRecommendation(finding.finding_type);
  const topSignals = deriveTopSignals(finding.finding_type, finding.evidence);

  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-slate-950">Summary</h3>

      <div className="mt-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">Why this fired</p>
          <p className="mt-1 text-sm text-slate-700">{whyThisFired}</p>
        </div>

        <div className="rounded-md border border-brand-200 bg-brand-50 p-3">
          <p className="text-sm font-semibold text-brand-900">Recommended action</p>
          <p className="mt-1 text-sm text-brand-900">{recommendation}</p>
          <p className="mt-2 text-xs text-brand-800">
            Recommendation source: {ai.recommendation.toUpperCase()}
            {ai.confidence !== null ? ` (${Math.round(ai.confidence * 100)}% confidence)` : ""}
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-700">Top signals</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {topSignals.length === 0 ? (
              <span className="text-sm text-slate-500">No explicit top signals available.</span>
            ) : (
              topSignals.map((signal) => (
                <span key={signal} className="badge bg-slate-100 text-slate-700">
                  {signal}
                </span>
              ))
            )}
          </div>
        </div>

        <details className="rounded-md border border-slate-200">
          <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-slate-700">Score breakdown</summary>
          <div className="border-t border-slate-200 px-3 py-2">
            {finding.score_breakdown ? (
              <pre className="overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
                {safeJsonStringify(finding.score_breakdown)}
              </pre>
            ) : (
              <p className="text-sm text-slate-500">No score breakdown details are stored for this finding.</p>
            )}
          </div>
        </details>
      </div>
    </section>
  );
}
