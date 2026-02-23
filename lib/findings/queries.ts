import { ApiError } from "@/lib/errors";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";
import { getAiExplanationProvider } from "@/lib/ai";
import { defaultRecommendationForFindingType } from "@/lib/risk/recommendations";

type RelationValue<T> = T | T[] | null;

type FindingsFilters = {
  status?:
    | "open"
    | "reviewed"
    | "in_review"
    | "escalated"
    | "resolved"
    | "suppressed"
    | "false_positive";
  severity?: "low" | "medium" | "high" | "critical";
  type?: string;
  identityId?: string;
};

export type FindingListRow = {
  id: string;
  finding_type: string;
  severity: "low" | "medium" | "high" | "critical";
  status: string;
  score: number;
  created_at: string;
  identity: { id?: string; name: string; email: string | null; type: string } | null;
  application: { id?: string; name: string } | null;
};

export type FindingWorkspaceDetail = {
  finding: {
    id: string;
    tenant_id: string;
    identity_id: string;
    application_id: string | null;
    finding_type: string;
    severity: "low" | "medium" | "high" | "critical";
    score: number;
    status: string;
    assigned_to: string | null;
    priority: "low" | "medium" | "high" | "critical" | null;
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
    identity: {
      id: string;
      name: string;
      email: string | null;
      type: string;
      privilege_level: number;
      is_privileged: boolean;
    } | null;
    application: {
      id: string;
      name: string;
      category: string;
    } | null;
    assigned_profile: {
      id: string;
      full_name: string;
      role: string;
    } | null;
  };
  ai: {
    recommendation: "approve" | "revoke" | "investigate";
    confidence: number | null;
    rationale: string[];
  };
  tenant: {
    id: string;
    name: string;
  } | null;
  recentEvents: Array<{
    id: string;
    event_type: string;
    application_id: string;
    application_name: string | null;
    ip_address: string;
    country: string;
    ts: string;
    success: boolean;
    metadata: Record<string, unknown>;
  }>;
  entitlements: Array<{
    id: string;
    entitlement_id: string;
    name: string;
    privilege_weight: number;
    granted_at: string;
    granted_by: string | null;
    granted_by_name: string | null;
  }>;
  reviewActions: Array<{
    id: string;
    action: string;
    note: string | null;
    created_at: string;
    previous_status: string | null;
    new_status: string | null;
    metadata: Record<string, unknown> | null;
    actor: {
      id: string;
      full_name: string;
      role: string;
    } | null;
  }>;
  relatedOpenFindings: Array<{
    id: string;
    finding_type: string;
    severity: "low" | "medium" | "high" | "critical";
    status: string;
    score: number;
    created_at: string;
    application_name: string | null;
  }>;
  identityStats: {
    entitlementCount: number;
    openFindingCount: number;
    lastSuccessfulLoginAt: string | null;
  };
};

function assertNoError(error: { message: string } | null, message: string) {
  if (error) {
    throw new ApiError(500, message, error.message, "QUERY_FAILED");
  }
}

function firstRecord<T>(value: RelationValue<T>): T | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export async function listTenantFindings(tenantId: string, filters: FindingsFilters) {
  const supabase = createServerSupabaseServiceClient();

  let query = supabase
    .from("risk_findings")
    .select(
      "id, finding_type, severity, status, score, created_at, identity:identities(id,name,email,type), application:applications(id,name)"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.severity) {
    query = query.eq("severity", filters.severity);
  }
  if (filters.type) {
    query = query.eq("finding_type", filters.type);
  }
  if (filters.identityId) {
    query = query.eq("identity_id", filters.identityId);
  }

  const res = await query;
  assertNoError(res.error, "Failed to list findings");

  const rows = (res.data ?? []) as Array<{
    id: string;
    finding_type: string;
    severity: "low" | "medium" | "high" | "critical";
    status: string;
    score: number;
    created_at: string;
    identity: RelationValue<{ id?: string; name: string; email: string | null; type: string }>;
    application: RelationValue<{ id?: string; name: string }>;
  }>;

  return rows.map((row) => ({
    ...row,
    identity: firstRecord(row.identity),
    application: firstRecord(row.application)
  }));
}

export async function getFindingWorkspaceDetail(tenantId: string, findingId: string): Promise<FindingWorkspaceDetail | null> {
  const supabase = createServerSupabaseServiceClient();

  const findingRes = await supabase
    .from("risk_findings")
    .select(
      "id, tenant_id, identity_id, application_id, finding_type, severity, score, status, assigned_to, priority, due_at, disposition, confidence, detector_version, rule_ids, score_breakdown, explanation, evidence, created_at, updated_at, identity:identities(id,name,email,type,privilege_level,is_privileged), application:applications(id,name,category), assigned_profile:profiles!risk_findings_assigned_to_fkey(id,full_name,role)"
    )
    .eq("tenant_id", tenantId)
    .eq("id", findingId)
    .single();

  if (findingRes.error) {
    if (findingRes.error.code === "PGRST116") {
      return null;
    }

    throw new ApiError(500, "Failed to load finding", findingRes.error.message, "QUERY_FAILED");
  }

  const findingRaw = findingRes.data as {
    id: string;
    tenant_id: string;
    identity_id: string;
    application_id: string | null;
    finding_type: string;
    severity: "low" | "medium" | "high" | "critical";
    score: number;
    status: string;
    assigned_to: string | null;
    priority: "low" | "medium" | "high" | "critical" | null;
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
    identity: RelationValue<{
      id: string;
      name: string;
      email: string | null;
      type: string;
      privilege_level: number;
      is_privileged: boolean;
    }>;
    application: RelationValue<{
      id: string;
      name: string;
      category: string;
    }>;
    assigned_profile: RelationValue<{
      id: string;
      full_name: string;
      role: string;
    }>;
  };

  const finding = {
    ...findingRaw,
    identity: firstRecord(findingRaw.identity),
    application: firstRecord(findingRaw.application),
    assigned_profile: firstRecord(findingRaw.assigned_profile)
  };

  const [tenantRes, eventsRes, grantsRes, actionsRes, relatedRes, openCountRes] = await Promise.all([
    supabase.from("tenants").select("id, name").eq("id", tenantId).single(),
    supabase
      .from("access_events")
      .select("id, event_type, application_id, ip_address, country, ts, success, metadata, application:applications(name)")
      .eq("tenant_id", tenantId)
      .eq("identity_id", finding.identity_id)
      .order("ts", { ascending: false })
      .limit(20),
    supabase
      .from("identity_entitlements")
      .select("id, entitlement_id, granted_at, granted_by")
      .eq("tenant_id", tenantId)
      .eq("identity_id", finding.identity_id)
      .order("granted_at", { ascending: false }),
    supabase
      .from("review_actions")
      .select("id, action, note, created_at, actor_user_id, previous_status, new_status, metadata")
      .eq("tenant_id", tenantId)
      .eq("finding_id", findingId)
      .order("created_at", { ascending: false }),
    supabase
      .from("risk_findings")
      .select("id, finding_type, severity, status, score, created_at, application:applications(name)")
      .eq("tenant_id", tenantId)
      .eq("identity_id", finding.identity_id)
      .neq("id", findingId)
      .in("status", ["open", "reviewed", "in_review", "escalated"])
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("risk_findings")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("identity_id", finding.identity_id)
      .in("status", ["open", "reviewed", "in_review", "escalated"])
  ]);

  assertNoError(tenantRes.error, "Failed to fetch tenant");
  assertNoError(eventsRes.error, "Failed to fetch access events");
  assertNoError(grantsRes.error, "Failed to fetch identity entitlements");
  assertNoError(actionsRes.error, "Failed to fetch review actions");
  assertNoError(relatedRes.error, "Failed to fetch related findings");
  assertNoError(openCountRes.error, "Failed to fetch open finding count");

  const grants = (grantsRes.data ?? []) as Array<{
    id: string;
    entitlement_id: string;
    granted_at: string;
    granted_by: string | null;
  }>;

  const entitlementIds = [...new Set(grants.map((grant) => grant.entitlement_id))];
  const granterIds = [...new Set(grants.map((grant) => grant.granted_by).filter((id): id is string => Boolean(id)))];

  let entitlementsById = new Map<string, { id: string; name: string; privilege_weight: number }>();
  if (entitlementIds.length) {
    const entitlementRes = await supabase
      .from("entitlements")
      .select("id, name, privilege_weight")
      .eq("tenant_id", tenantId)
      .in("id", entitlementIds);
    assertNoError(entitlementRes.error, "Failed to fetch entitlement records");

    entitlementsById = new Map(
      (entitlementRes.data ?? []).map((entry: { id: string; name: string; privilege_weight: number }) => [entry.id, entry])
    );
  }

  let profilesById = new Map<string, { id: string; full_name: string; role: string }>();
  if (granterIds.length) {
    const granterRes = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("tenant_id", tenantId)
      .in("id", granterIds);
    assertNoError(granterRes.error, "Failed to fetch granting profiles");

    profilesById = new Map(
      (granterRes.data ?? []).map((entry: { id: string; full_name: string; role: string }) => [entry.id, entry])
    );
  }

  const actions = (actionsRes.data ?? []) as Array<{
    id: string;
    action: string;
    note: string | null;
    created_at: string;
    actor_user_id: string;
    previous_status: string | null;
    new_status: string | null;
    metadata: Record<string, unknown> | null;
  }>;
  const actionActorIds = [...new Set(actions.map((action) => action.actor_user_id))];

  let actionActorMap = new Map<string, { id: string; full_name: string; role: string }>();
  if (actionActorIds.length) {
    const actorRes = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("tenant_id", tenantId)
      .in("id", actionActorIds);
    assertNoError(actorRes.error, "Failed to fetch action actors");

    actionActorMap = new Map(
      (actorRes.data ?? []).map((entry: { id: string; full_name: string; role: string }) => [entry.id, entry])
    );
  }

  const events = ((eventsRes.data ?? []) as Array<{
    id: string;
    event_type: string;
    application_id: string;
    ip_address: string;
    country: string;
    ts: string;
    success: boolean;
    metadata: Record<string, unknown>;
    application: RelationValue<{ name: string }>;
  }>).map((event) => ({
    id: event.id,
    event_type: event.event_type,
    application_id: event.application_id,
    application_name: firstRecord(event.application)?.name ?? null,
    ip_address: event.ip_address,
    country: event.country,
    ts: event.ts,
    success: event.success,
    metadata: event.metadata
  }));

  const lastSuccessfulLoginAt =
    events.find(
      (event) => event.success && (event.event_type === "interactive_login" || event.event_type === "login")
    )?.ts ?? null;

  let explanation = finding.explanation;
  let aiConfidence = finding.confidence;
  let aiRationale: string[] = [];
  const aiRecommendation = defaultRecommendationForFindingType(finding.finding_type);

  if (!finding.explanation) {
    const provider = getAiExplanationProvider();
    const ai = await provider.generateExplanation({
      findingType: finding.finding_type,
      severity: finding.severity,
      score: finding.score,
      identityName: finding.identity?.name ?? "Unknown identity",
      applicationName: finding.application?.name ?? null,
      evidence: finding.evidence
    });

    explanation = ai.explanation;
    aiConfidence = ai.confidence;
    aiRationale = ai.rationale;

    const updateRes = await supabase
      .from("risk_findings")
      .update({ explanation: ai.explanation, confidence: ai.confidence })
      .eq("tenant_id", tenantId)
      .eq("id", findingId);
    assertNoError(updateRes.error, "Failed to save finding explanation");
  }

  const relatedOpenFindings = ((relatedRes.data ?? []) as Array<{
    id: string;
    finding_type: string;
    severity: "low" | "medium" | "high" | "critical";
    status: string;
    score: number;
    created_at: string;
    application: RelationValue<{ name: string }>;
  }>).map((entry) => ({
    id: entry.id,
    finding_type: entry.finding_type,
    severity: entry.severity,
    status: entry.status,
    score: entry.score,
    created_at: entry.created_at,
    application_name: firstRecord(entry.application)?.name ?? null
  }));

  return {
    finding: {
      ...finding,
      explanation,
      confidence: aiConfidence
    },
    ai: {
      recommendation: aiRecommendation,
      confidence: aiConfidence,
      rationale: aiRationale
    },
    tenant: tenantRes.data
      ? {
          id: tenantRes.data.id,
          name: tenantRes.data.name
        }
      : null,
    recentEvents: events,
    entitlements: grants
      .map((grant) => {
        const entitlement = entitlementsById.get(grant.entitlement_id);
        if (!entitlement) {
          return null;
        }

        return {
          id: grant.id,
          entitlement_id: entitlement.id,
          name: entitlement.name,
          privilege_weight: entitlement.privilege_weight,
          granted_at: grant.granted_at,
          granted_by: grant.granted_by,
          granted_by_name: grant.granted_by ? profilesById.get(grant.granted_by)?.full_name ?? null : null
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    reviewActions: actions.map((action) => ({
      id: action.id,
      action: action.action,
      note: action.note,
      created_at: action.created_at,
      previous_status: action.previous_status,
      new_status: action.new_status,
      metadata: action.metadata,
      actor: actionActorMap.get(action.actor_user_id) ?? null
    })),
    relatedOpenFindings,
    identityStats: {
      entitlementCount: grants.length,
      openFindingCount: openCountRes.count ?? 0,
      lastSuccessfulLoginAt
    }
  };
}

export async function listTenantAssignableProfiles(tenantId: string) {
  const supabase = createServerSupabaseServiceClient();
  const res = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("tenant_id", tenantId)
    .in("role", ["admin", "analyst"])
    .order("full_name", { ascending: true });

  assertNoError(res.error, "Failed to fetch assignable profiles");

  return (res.data ?? []) as Array<{
    id: string;
    full_name: string;
    role: string;
  }>;
}
