const findingTypeLabelMap: Record<string, string> = {
  dormant_privileged_account: "Dormant privileged account",
  service_interactive_login_anomaly: "Service account interactive login",
  excessive_privilege_count: "Excessive privilege count",
  toxic_combination: "Toxic combination",
  new_privilege_unusual_country: "New privilege + unusual country"
};

const recommendationMap: Record<string, string> = {
  dormant_privileged_account: "Investigate and disable dormant privileged access if no approved business need exists.",
  service_interactive_login_anomaly:
    "Revoke interactive authentication path for the service account and rotate credentials.",
  excessive_privilege_count: "Review and reduce high-weight entitlements to least privilege.",
  toxic_combination: "Separate duties immediately by removing one side of the toxic entitlement pair.",
  new_privilege_unusual_country:
    "Validate user activity and travel context before allowing elevated access to remain active."
};

const topSignalMap: Record<string, string[]> = {
  dormant_privileged_account: ["Privileged identity", "No successful login in 90+ days", "Dormancy pattern"],
  service_interactive_login_anomaly: [
    "Service identity",
    "Interactive login detected",
    "Human-style access pattern"
  ],
  excessive_privilege_count: ["Privilege weight above threshold", "High entitlement count", "Broad access scope"],
  toxic_combination: ["create_vendor present", "approve_payment present", "Segregation-of-duties violation"],
  new_privilege_unusual_country: ["Privilege granted in last 7 days", "Login from new country", "Behavior shift"]
};

function titleCase(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function formatFindingTypeLabel(findingType: string) {
  if (findingTypeLabelMap[findingType]) {
    return findingTypeLabelMap[findingType];
  }

  return findingType
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map(titleCase)
    .join(" ");
}

export function formatFindingStatusLabel(status: string) {
  if (status === "reviewed") {
    return "IN REVIEW";
  }

  return status
    .replace(/[_\-]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk.toUpperCase())
    .join(" ");
}

export function deriveWhyThisFired(findingType: string, explanation: string | null | undefined) {
  if (explanation && explanation.trim()) {
    return explanation.trim();
  }

  return `This finding matched the ${formatFindingTypeLabel(
    findingType
  )} detector based on identity behavior and entitlement evidence.`;
}

export function deriveRecommendation(findingType: string) {
  return recommendationMap[findingType] ?? "Investigate context, validate policy intent, and document the disposition.";
}

export function deriveTopSignals(findingType: string, evidence: Record<string, unknown>) {
  const configured = topSignalMap[findingType] ?? [];

  const evidenceSignals = Object.entries(evidence)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .slice(0, 3)
    .map(([key]) => key.replace(/[_\-]+/g, " "));

  return [...new Set([...configured, ...evidenceSignals])].slice(0, 6);
}

export function safeJsonStringify(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}
