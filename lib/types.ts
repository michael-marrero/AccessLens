export type ProfileRole = "admin" | "analyst";
export type IdentityType = "human" | "service";
export type FindingSeverity = "low" | "medium" | "high" | "critical";
export type FindingStatus =
  | "open"
  | "reviewed"
  | "in_review"
  | "escalated"
  | "resolved"
  | "suppressed"
  | "false_positive";
export type FindingPriority = "low" | "medium" | "high" | "critical";
export type ReviewAction = "approve" | "revoke" | "investigate" | "update";

export type Tenant = {
  id: string;
  name: string;
  created_at: string;
};

export type Profile = {
  id: string;
  tenant_id: string;
  role: ProfileRole;
  full_name: string;
  created_at: string;
};

export type Identity = {
  id: string;
  tenant_id: string;
  type: IdentityType;
  name: string;
  email: string | null;
  privilege_level: number;
  is_privileged: boolean;
  created_at: string;
};

export type Application = {
  id: string;
  tenant_id: string;
  name: string;
  category: string;
  created_at: string;
};

export type Entitlement = {
  id: string;
  tenant_id: string;
  application_id: string;
  name: string;
  privilege_weight: number;
  created_at: string;
};

export type IdentityEntitlement = {
  id: string;
  tenant_id: string;
  identity_id: string;
  entitlement_id: string;
  granted_at: string;
  granted_by: string | null;
};

export type AccessEvent = {
  id: string;
  tenant_id: string;
  identity_id: string;
  application_id: string;
  event_type: string;
  ip_address: string;
  country: string;
  ts: string;
  success: boolean;
  metadata: Record<string, unknown>;
};

export type RiskFinding = {
  id: string;
  tenant_id: string;
  identity_id: string;
  application_id: string | null;
  finding_type: string;
  severity: FindingSeverity;
  score: number;
  status: FindingStatus;
  assigned_to: string | null;
  priority: FindingPriority | null;
  due_at: string | null;
  disposition: string | null;
  confidence: number | null;
  detector_version: string | null;
  rule_ids: string[] | null;
  score_breakdown: Record<string, unknown> | null;
  explanation: string | null;
  evidence: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ReviewActionRow = {
  id: string;
  tenant_id: string;
  finding_id: string;
  actor_user_id: string;
  action: ReviewAction;
  note: string | null;
  previous_status: string | null;
  new_status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};
