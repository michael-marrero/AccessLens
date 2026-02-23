import { formatFindingTypeLabel } from "@/lib/findings/format";

export function FindingTypeLabel({ findingType }: { findingType: string }) {
  return <>{formatFindingTypeLabel(findingType)}</>;
}
