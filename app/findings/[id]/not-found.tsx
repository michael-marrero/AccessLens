import Link from "next/link";

export default function FindingDetailNotFound() {
  return (
    <div className="card space-y-3">
      <h2 className="text-lg font-semibold text-slate-950">Finding not found</h2>
      <p className="text-sm text-slate-600">
        This finding does not exist or you do not have access to it in the current tenant.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Back To Dashboard
      </Link>
    </div>
  );
}
