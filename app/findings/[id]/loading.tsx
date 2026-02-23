export default function FindingDetailLoading() {
  return (
    <div className="space-y-4">
      <div className="card animate-pulse">
        <div className="h-4 w-40 rounded bg-slate-200" />
        <div className="mt-3 h-8 w-80 rounded bg-slate-200" />
        <div className="mt-2 h-4 w-96 rounded bg-slate-200" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <div className="card animate-pulse">
          <div className="h-5 w-36 rounded bg-slate-200" />
          <div className="mt-3 h-20 rounded bg-slate-200" />
        </div>
        <div className="card animate-pulse">
          <div className="h-5 w-24 rounded bg-slate-200" />
          <div className="mt-3 h-48 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
