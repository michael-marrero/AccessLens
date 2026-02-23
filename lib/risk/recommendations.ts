import { FINDING_TYPES } from "@/lib/risk/constants";

export type RecommendationAction = "approve" | "revoke" | "investigate";

export function defaultRecommendationForFindingType(type: string): RecommendationAction {
  switch (type) {
    case FINDING_TYPES.TOXIC_COMBINATION:
    case FINDING_TYPES.SERVICE_INTERACTIVE_LOGIN_ANOMALY:
      return "revoke";
    case FINDING_TYPES.DORMANT_PRIVILEGED_ACCOUNT:
    case FINDING_TYPES.EXCESSIVE_PRIVILEGE_COUNT:
      return "investigate";
    case FINDING_TYPES.NEW_PRIVILEGE_UNUSUAL_COUNTRY:
      return "approve";
    default:
      return "investigate";
  }
}
