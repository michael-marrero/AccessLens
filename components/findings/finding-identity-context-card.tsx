import Link from "next/link";
import type { Route } from "next";
import type { FindingWorkspaceDetail } from "@/lib/findings/queries";

type Props = {
  detail: FindingWorkspaceDetail;
};

export function FindingIdentityContextCard({ detail }: Props) {
  const identity = detail.finding.identity;

  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-slate-950">Identity Context</h3>

      {!identity ? (
        <p className="mt-3 text-sm text-slate-500">Identity record is unavailable for this finding.</p>
      ) : (
        <div className="mt-3 space-y-3 text-sm text-slate-700">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Name</p>
              <p className="font-medium text-slate-900">{identity.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Type</p>
              <p className="font-medium text-slate-900">{identity.type}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
              <p className="font-medium text-slate-900">{identity.email ?? "N/A"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Privilege Level</p>
              <p className="font-medium text-slate-900">
                {identity.privilege_level}
                {identity.is_privileged ? (
                  <span className="ml-2 badge bg-red-100 text-red-700">Privileged</span>
                ) : (
                  <span className="ml-2 badge bg-slate-100 text-slate-700">Standard</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Entitlements</p>
              <p className="font-medium text-slate-900">{detail.identityStats.entitlementCount}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Open Findings</p>
              <p className="font-medium text-slate-900">{detail.identityStats.openFindingCount}</p>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Last Successful Login</p>
            <p className="font-medium text-slate-900">
              {detail.identityStats.lastSuccessfulLoginAt
                ? new Date(detail.identityStats.lastSuccessfulLoginAt).toLocaleString()
                : "Not observed"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Related Open Findings</p>
            {detail.relatedOpenFindings.length === 0 ? (
              <p className="text-sm text-slate-500">No additional open findings for this identity.</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {detail.relatedOpenFindings.map((relatedFinding) => (
                  <li key={relatedFinding.id} className="text-sm text-slate-700">
                    {relatedFinding.finding_type} • {relatedFinding.status} • {relatedFinding.score.toFixed(1)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            href={`/dashboard?identityId=${detail.finding.identity_id}` as Route}
          >
            View all findings for this identity
          </Link>
        </div>
      )}
    </section>
  );
}
