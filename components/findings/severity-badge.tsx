import type { FindingSeverity } from "@/lib/types";

const classBySeverity: Record<FindingSeverity, string> = {
  low: "badge bg-slate-200 text-slate-700",
  medium: "badge bg-amber-100 text-amber-800",
  high: "badge bg-orange-100 text-orange-800",
  critical: "badge bg-red-100 text-red-800"
};

export function SeverityBadge({ severity }: { severity: FindingSeverity }) {
  return <span className={classBySeverity[severity]}>{severity.toUpperCase()}</span>;
}
