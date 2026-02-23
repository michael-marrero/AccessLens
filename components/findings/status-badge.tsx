import { formatFindingStatusLabel } from "@/lib/findings/format";

const classByStatus: Record<string, string> = {
  open: "badge bg-blue-100 text-blue-800",
  reviewed: "badge bg-violet-100 text-violet-800",
  in_review: "badge bg-violet-100 text-violet-800",
  escalated: "badge bg-fuchsia-100 text-fuchsia-800",
  resolved: "badge bg-emerald-100 text-emerald-800",
  suppressed: "badge bg-slate-200 text-slate-700",
  false_positive: "badge bg-cyan-100 text-cyan-800"
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={classByStatus[status] ?? "badge bg-slate-200 text-slate-700"}>{formatFindingStatusLabel(status)}</span>;
}
