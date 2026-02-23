export const FINDING_TYPES = {
  DORMANT_PRIVILEGED_ACCOUNT: "dormant_privileged_account",
  SERVICE_INTERACTIVE_LOGIN_ANOMALY: "service_interactive_login_anomaly",
  EXCESSIVE_PRIVILEGE_COUNT: "excessive_privilege_count",
  TOXIC_COMBINATION: "toxic_combination",
  NEW_PRIVILEGE_UNUSUAL_COUNTRY: "new_privilege_unusual_country"
} as const;

export const ALL_FINDING_TYPES = Object.values(FINDING_TYPES);

export const TOXIC_ENTITLEMENTS = ["create_vendor", "approve_payment"] as const;
