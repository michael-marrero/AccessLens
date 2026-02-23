import { ApiError } from "@/lib/errors";
import { getAiExplanationProvider } from "@/lib/ai";
import { defaultRecommendationForFindingType } from "@/lib/risk/recommendations";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";

type FindingsFilters = {
  status?: "open" | "reviewed" | "resolved";
  severity?: "low" | "medium" | "high" | "critical";
  type?: string;
};

type RelationValue<T> = T | T[] | null;

type RawFindingListRow = {
  id: string;
  finding_type: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "reviewed" | "resolved";
  score: number;
  created_at: string;
  identity: RelationValue<{ name: string; email: string | null; type: string }>;
  application: RelationValue<{ name: string }>;
};

type RawFindingDetail = {
  id: string;
  tenant_id: string;
  identity_id: string;
  application_id: string | null;
  finding_type: string;
  severity: "low" | "medium" | "high" | "critical";
  score: number;
  status: "open" | "reviewed" | "resolved";
  explanation: string | null;
  evidence: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  identity: RelationValue<{ name: string; email: string | null; type: string }>;
  application: RelationValue<{ name: string; category: string }>;
};

type RawReviewAction = {
  id: string;
  action: "approve" | "revoke" | "investigate";
  note: string | null;
  created_at: string;
  actor_user_id: string;
};

function assertNoError(error: { message: string } | null, message: string) {
  if (error) {
    throw new ApiError(500, message, error.message);
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
      "id, finding_type, severity, status, score, created_at, identity:identities(name,email,type), application:applications(name)"
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

  const res = await query;
  assertNoError(res.error, "Failed to list findings");

  const rows = (res.data ?? []) as unknown as RawFindingListRow[];

  return rows.map((row) => ({
    ...row,
    identity: firstRecord(row.identity),
    application: firstRecord(row.application)
  }));
}

export async function getFindingDetail(tenantId: string, findingId: string) {
  const supabase = createServerSupabaseServiceClient();

  const findingRes = await supabase
    .from("risk_findings")
    .select(
      "id, tenant_id, identity_id, application_id, finding_type, severity, score, status, explanation, evidence, created_at, updated_at, identity:identities(name,email,type), application:applications(name,category)"
    )
    .eq("tenant_id", tenantId)
    .eq("id", findingId)
    .single();

  if (findingRes.error || !findingRes.data) {
    throw new ApiError(404, "Finding not found", findingRes.error?.message);
  }

  const findingRaw = findingRes.data as unknown as RawFindingDetail;
  const finding = {
    ...findingRaw,
    identity: firstRecord(findingRaw.identity),
    application: firstRecord(findingRaw.application)
  };

  const actionsRes = await supabase
    .from("review_actions")
    .select("id, action, note, created_at, actor_user_id")
    .eq("tenant_id", tenantId)
    .eq("finding_id", findingId)
    .order("created_at", { ascending: false });
  assertNoError(actionsRes.error, "Failed to fetch review history");

  const rawActions = (actionsRes.data ?? []) as RawReviewAction[];
  const actorIds = [...new Set(rawActions.map((action) => action.actor_user_id))];

  let actorMap = new Map<string, { full_name: string; role: string }>();
  if (actorIds.length) {
    const profilesRes = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("tenant_id", tenantId)
      .in("id", actorIds);
    assertNoError(profilesRes.error, "Failed to fetch action actor profiles");

    actorMap = new Map(
      (profilesRes.data ?? []).map((row: { id: string; full_name: string; role: string }) => [
        row.id,
        { full_name: row.full_name, role: row.role }
      ])
    );
  }

  let explanation = finding.explanation;
  let recommendation = defaultRecommendationForFindingType(finding.finding_type);
  let confidence: number | null = null;
  let rationale: string[] = [];

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
    recommendation = ai.recommendation;
    confidence = ai.confidence;
    rationale = ai.rationale;

    const updateRes = await supabase
      .from("risk_findings")
      .update({ explanation: ai.explanation })
      .eq("tenant_id", tenantId)
      .eq("id", findingId);
    assertNoError(updateRes.error, "Failed to save finding explanation");
  }

  return {
    ...finding,
    explanation,
    ai: {
      recommendation,
      confidence,
      rationale
    },
    actions: rawActions.map((action) => ({
      id: action.id,
      action: action.action,
      note: action.note,
      created_at: action.created_at,
      actor: actorMap.get(action.actor_user_id) ?? {
        full_name: "Unknown analyst",
        role: "analyst"
      }
    }))
  };
}
