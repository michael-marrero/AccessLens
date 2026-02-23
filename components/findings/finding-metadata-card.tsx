import type { FindingWorkspaceDetail } from "@/lib/findings/queries";

type Props = {
  detail: FindingWorkspaceDetail;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

export function FindingMetadataCard({ detail }: Props) {
  const { finding } = detail;

  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-slate-950">Metadata</h3>

      <div className="mt-4 space-y-3">
        <Field label="Finding ID" value={finding.id} />
        <Field label="Tenant" value={detail.tenant ? `${detail.tenant.name} (${detail.tenant.id})` : finding.tenant_id} />
        <Field label="Detector Version" value={finding.detector_version ?? "Not available"} />
        <Field label="Rule IDs" value={finding.rule_ids?.join(", ") ?? "Not available"} />
        <Field label="Score" value={finding.score.toFixed(2)} />
        <Field label="Created" value={new Date(finding.created_at).toLocaleString()} />
        <Field label="Updated" value={new Date(finding.updated_at).toLocaleString()} />
        <Field label="Assigned To" value={finding.assigned_profile?.full_name ?? "Unassigned"} />
        <Field
          label="Created By"
          value={typeof finding.evidence.created_by === "string" ? finding.evidence.created_by : "system"}
        />
        <Field
          label="AI / Model"
          value={typeof finding.evidence.model_version === "string" ? finding.evidence.model_version : "Not available"}
        />
      </div>
    </section>
  );
}
