export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="card text-center">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{detail}</p>
    </div>
  );
}
