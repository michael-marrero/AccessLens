import type { FindingStatus } from "@/lib/types";

const classByStatus: Record<FindingStatus, string> = {
  open: "badge bg-blue-100 text-blue-800",
  reviewed: "badge bg-violet-100 text-violet-800",
  resolved: "badge bg-emerald-100 text-emerald-800"
};

export function StatusBadge({ status }: { status: FindingStatus }) {
  return <span className={classByStatus[status]}>{status.toUpperCase()}</span>;
}
