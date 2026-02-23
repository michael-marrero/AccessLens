"use client";

import { useEffect, useMemo, useState } from "react";
import {
  actionStatuses,
  findingDispositions,
  findingPriorities,
  mapDbStatusToActionStatus,
  type FindingActionPayload
} from "@/lib/findings/validation";
import type { FindingWorkspaceDetail } from "@/lib/findings/queries";

type Props = {
  finding: FindingWorkspaceDetail["finding"];
  assignees: Array<{ id: string; full_name: string; role: string }>;
  currentUser: { id: string; fullName: string; role: string };
  isSaving: boolean;
  onSubmit: (payload: FindingActionPayload) => Promise<void>;
};

type FormState = {
  status: (typeof actionStatuses)[number];
  assignedTo: string;
  priority: string;
  dueAt: string;
  disposition: string;
  note: string;
};

function toLocalDateTimeValue(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

function isClosingStatus(status: string) {
  return status === "RESOLVED" || status === "SUPPRESSED" || status === "FALSE_POSITIVE";
}

export function FindingActionPanel({ finding, assignees, currentUser, isSaving, onSubmit }: Props) {
  const [form, setForm] = useState<FormState>({
    status: mapDbStatusToActionStatus(finding.status),
    assignedTo: finding.assigned_to ?? "",
    priority: finding.priority ?? "",
    dueAt: toLocalDateTimeValue(finding.due_at),
    disposition: finding.disposition ?? "",
    note: ""
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      status: mapDbStatusToActionStatus(finding.status),
      assignedTo: finding.assigned_to ?? "",
      priority: finding.priority ?? "",
      dueAt: toLocalDateTimeValue(finding.due_at),
      disposition: finding.disposition ?? ""
    }));
  }, [finding.assigned_to, finding.due_at, finding.priority, finding.status, finding.disposition]);

  const shouldShowDisposition = useMemo(() => isClosingStatus(form.status), [form.status]);

  const submit = async () => {
    await onSubmit({
      status: form.status,
      assignedTo: form.assignedTo || null,
      priority: form.priority ? (form.priority as (typeof findingPriorities)[number]) : null,
      dueAt: form.dueAt || null,
      disposition: shouldShowDisposition ? (form.disposition as (typeof findingDispositions)[number] | "" | null) || null : null,
      note: form.note || null
    });

    setForm((current) => ({ ...current, note: "" }));
  };

  return (
    <section className="card lg:sticky lg:top-24">
      <h3 className="text-lg font-semibold text-slate-950">Action Panel</h3>

      <div className="mt-4 space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Status
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={form.status}
            disabled={isSaving}
            onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as FormState["status"] }))}
          >
            {actionStatuses.map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Assigned To
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={form.assignedTo}
            disabled={isSaving}
            onChange={(event) => setForm((current) => ({ ...current, assignedTo: event.target.value }))}
          >
            <option value="">Unassigned</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.full_name} ({assignee.role})
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Priority
          <select
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={form.priority}
            disabled={isSaving}
            onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
          >
            <option value="">Not set</option>
            {findingPriorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Due At
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={form.dueAt}
            disabled={isSaving}
            onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))}
          />
        </label>

        {shouldShowDisposition ? (
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Disposition
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={form.disposition}
              disabled={isSaving}
              onChange={(event) => setForm((current) => ({ ...current, disposition: event.target.value }))}
            >
              <option value="">Select disposition</option>
              {findingDispositions.map((disposition) => (
                <option key={disposition} value={disposition}>
                  {disposition}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Note
          <textarea
            rows={4}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={form.note}
            disabled={isSaving}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            placeholder="Document rationale and evidence for the status update"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-2">
        <button
          type="button"
          disabled={isSaving}
          className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          onClick={() => {
            void submit();
          }}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>

        <button
          type="button"
          disabled
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-400"
        >
          Save + Next (Coming soon)
        </button>

        <button
          type="button"
          disabled={isSaving}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          onClick={() => {
            void onSubmit({
              assignedTo: currentUser.id,
              note: form.note || null
            });
          }}
        >
          Assign To Me
        </button>

        <button
          type="button"
          disabled={isSaving}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          onClick={() => {
            void onSubmit({
              status: "IN_REVIEW",
              note: form.note || null
            });
          }}
        >
          Mark In Review
        </button>
      </div>
    </section>
  );
}
