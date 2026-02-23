export function ConfidenceBadge({ confidence }: { confidence: number | null | undefined }) {
  if (confidence === null || confidence === undefined) {
    return null;
  }

  return <span className="badge bg-indigo-100 text-indigo-800">Confidence {Math.round(confidence * 100)}%</span>;
}
