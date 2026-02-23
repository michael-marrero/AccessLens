"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { FindingTypeLabel } from "@/components/findings/finding-type-label";
import { SeverityBadge } from "@/components/findings/severity-badge";
import { StatusBadge } from "@/components/findings/status-badge";
import { ConfidenceBadge } from "@/components/findings/confidence-badge";
import type { FindingWorkspaceDetail } from "@/lib/findings/queries";

type Props = {
  finding: FindingWorkspaceDetail["finding"];
  onAssignToMe: () => Promise<void>;
  onMarkInReview: () => Promise<void>;
  isBusy: boolean;
};

export function FindingHeader({ finding, onAssignToMe, onMarkInReview, isBusy }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const copyFindingId = async () => {
    try {
      await navigator.clipboard.writeText(finding.id);
    } catch {
      // ignore clipboard failure
    } finally {
      setMenuOpen(false);
    }
  };

  return (
    <section className="card lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="text-sm text-slate-600">
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          <span className="mx-2">/</span>
          <Link href="/dashboard" className="hover:underline">
            Findings
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-800">
            <FindingTypeLabel findingType={finding.finding_type} />
          </span>
        </nav>

        <Link
          href={"/dashboard" as Route}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Back To Dashboard
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-semibold text-slate-950">
          <FindingTypeLabel findingType={finding.finding_type} />
        </h2>
        <SeverityBadge severity={finding.severity} />
        <StatusBadge status={finding.status} />
        <ConfidenceBadge confidence={finding.confidence} />
      </div>

      <p className="mt-2 text-sm text-slate-600">
        {finding.identity?.name ?? "Unknown identity"} • {finding.application?.name ?? "No application"} • Created{" "}
        {new Date(finding.created_at).toLocaleString()} • Updated {new Date(finding.updated_at).toLocaleString()}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isBusy}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          onClick={() => {
            void onAssignToMe();
          }}
        >
          Assign To Me
        </button>

        {finding.status === "open" ? (
          <button
            type="button"
            disabled={isBusy}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            onClick={() => {
              void onMarkInReview();
            }}
          >
            Mark In Review
          </button>
        ) : null}

        <div className="relative">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={() => setMenuOpen((current) => !current)}
          >
            ⋯
          </button>
          {menuOpen ? (
            <div className="absolute right-0 z-10 mt-2 w-48 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
              <button
                type="button"
                className="block w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  void copyFindingId();
                }}
              >
                Copy Finding ID
              </button>
              <button
                type="button"
                className="block w-full rounded px-3 py-2 text-left text-sm text-slate-500"
                onClick={() => setMenuOpen(false)}
              >
                Export JSON (stub)
              </button>
              <button
                type="button"
                className="block w-full rounded px-3 py-2 text-left text-sm text-slate-500"
                onClick={() => setMenuOpen(false)}
              >
                Suppress (stub)
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
