import { formatFindingStatusLabel } from "@/lib/findings/format";
import type { FindingWorkspaceDetail } from "@/lib/findings/queries";

type Props = {
  detail: FindingWorkspaceDetail;
};

type TimelineItem = {
  id: string;
  ts: string;
  label: string;
  detail: string;
  tone: "event" | "finding" | "action";
};

function classForTone(tone: TimelineItem["tone"]) {
  if (tone === "action") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (tone === "finding") {
    return "bg-brand-100 text-brand-800";
  }

  return "bg-slate-100 text-slate-700";
}

export function FindingTimelineCard({ detail }: Props) {
  const eventItems: TimelineItem[] = detail.recentEvents.map((event) => ({
    id: `evt-${event.id}`,
    ts: event.ts,
    label: `Event: ${event.event_type}`,
    detail: `${event.application_name ?? "Unknown app"} • ${event.country} • ${event.success ? "success" : "failure"}`,
    tone: "event"
  }));

  const findingItem: TimelineItem = {
    id: `finding-${detail.finding.id}`,
    ts: detail.finding.created_at,
    label: "Finding created",
    detail: `Detector raised ${detail.finding.finding_type}`,
    tone: "finding"
  };

  const actionItems: TimelineItem[] = detail.reviewActions.map((action) => ({
    id: `action-${action.id}`,
    ts: action.created_at,
    label: `Review action: ${action.action}`,
    detail: `${action.actor?.full_name ?? "Unknown analyst"} • ${
      action.previous_status && action.new_status
        ? `${formatFindingStatusLabel(action.previous_status)} -> ${formatFindingStatusLabel(action.new_status)}`
        : "no status transition"
    }${action.note ? ` • ${action.note}` : ""}`,
    tone: "action"
  }));

  const items = [findingItem, ...eventItems, ...actionItems].sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
  );

  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-slate-950">Timeline / Activity</h3>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No timeline events are available.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-md border border-slate-200 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className={`badge ${classForTone(item.tone)}`}>{item.label}</span>
                <span className="text-xs text-slate-500">{new Date(item.ts).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-slate-700">{item.detail}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
