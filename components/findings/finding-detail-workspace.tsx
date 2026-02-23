"use client";

import { useState } from "react";
import { authFetch } from "@/lib/http-client";
import type { FindingWorkspaceDetail } from "@/lib/findings/queries";
import type { FindingActionPayload } from "@/lib/findings/validation";
import { FindingHeader } from "@/components/findings/finding-header";
import { FindingSummaryCard } from "@/components/findings/finding-summary-card";
import { FindingEvidenceCard } from "@/components/findings/finding-evidence-card";
import { FindingIdentityContextCard } from "@/components/findings/finding-identity-context-card";
import { FindingTimelineCard } from "@/components/findings/finding-timeline-card";
import { FindingActionPanel } from "@/components/findings/finding-action-panel";
import { FindingMetadataCard } from "@/components/findings/finding-metadata-card";
import { FindingAuditCard } from "@/components/findings/finding-audit-card";

type Props = {
  initialDetail: FindingWorkspaceDetail;
  assignees: Array<{ id: string; full_name: string; role: string }>;
  currentUser: { id: string; fullName: string; role: string };
};

type ToastState = {
  type: "success" | "error";
  message: string;
};

export function FindingDetailWorkspace({ initialDetail, assignees, currentUser }: Props) {
  const [detail, setDetail] = useState<FindingWorkspaceDetail>(initialDetail);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const submitAction = async (payload: FindingActionPayload) => {
    setIsSaving(true);
    setToast(null);

    try {
      const data = await authFetch<{
        finding: FindingWorkspaceDetail;
        changes: Record<string, { previous: unknown; next: unknown }>;
      }>(`/api/findings/${detail.finding.id}/action`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setDetail(data.finding);
      setToast({ type: "success", message: "Finding action saved successfully." });
    } catch (error) {
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to save finding action"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {toast ? (
        <div
          className={
            toast.type === "success"
              ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          }
        >
          {toast.message}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <FindingHeader
          finding={detail.finding}
          isBusy={isSaving}
          onAssignToMe={async () => submitAction({ assignedTo: currentUser.id })}
          onMarkInReview={async () => submitAction({ status: "IN_REVIEW" })}
        />

        <div className="lg:col-start-1">
          <FindingSummaryCard finding={detail.finding} ai={detail.ai} />
        </div>

        <div className="lg:col-start-2 lg:row-start-2">
          <FindingActionPanel
            finding={detail.finding}
            assignees={assignees}
            currentUser={currentUser}
            isSaving={isSaving}
            onSubmit={submitAction}
          />
        </div>

        <div className="lg:col-start-1">
          <FindingEvidenceCard detail={detail} />
        </div>

        <div className="lg:col-start-1">
          <FindingIdentityContextCard detail={detail} />
        </div>

        <div className="lg:col-start-1">
          <FindingTimelineCard detail={detail} />
        </div>

        <div className="lg:col-start-2">
          <FindingMetadataCard detail={detail} />
        </div>

        <div className="lg:col-start-2">
          <FindingAuditCard reviewActions={detail.reviewActions} />
        </div>
      </div>
    </div>
  );
}
