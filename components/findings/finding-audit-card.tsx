import { formatFindingStatusLabel } from "@/lib/findings/format";
import type { FindingWorkspaceDetail } from "@/lib/findings/queries";

type Props = {
  reviewActions: FindingWorkspaceDetail["reviewActions"];
};

export function FindingAuditCard({ reviewActions }: Props) {
  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-slate-950">Audit Trail</h3>

      {reviewActions.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No review actions have been recorded for this finding.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {reviewActions.map((action) => (
            <li key={action.id} className="rounded-md border border-slate-200 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold uppercase text-slate-900">{action.action}</span>
                <span className="text-xs text-slate-500">{new Date(action.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-slate-600">
                {action.actor?.full_name ?? "Unknown actor"}
                {action.actor?.role ? ` (${action.actor.role})` : ""}
              </p>

              {action.previous_status || action.new_status ? (
                <p className="mt-1 text-slate-700">
                  {formatFindingStatusLabel(action.previous_status ?? "open")} {"->"}{" "}
                  {formatFindingStatusLabel(action.new_status ?? action.previous_status ?? "open")}
                </p>
              ) : null}

              {typeof action.metadata?.payload === "object" &&
              action.metadata?.payload &&
              typeof (action.metadata.payload as Record<string, unknown>).disposition === "string" ? (
                <p className="mt-1 text-slate-700">
                  Disposition: {(action.metadata.payload as Record<string, unknown>).disposition as string}
                </p>
              ) : null}

              {action.note ? <p className="mt-2 rounded bg-slate-50 p-2 text-slate-700">{action.note}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
