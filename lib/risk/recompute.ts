import { ApiError } from "@/lib/errors";
import { getServerEnv } from "@/lib/env";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";
import { ALL_FINDING_TYPES } from "@/lib/risk/constants";
import { computeRiskFindings } from "@/lib/risk/rules";
import type { AccessEvent, Application, Entitlement, Identity, IdentityEntitlement } from "@/lib/types";

function assertNoError(error: { message: string } | null, context: string) {
  if (error) {
    throw new ApiError(500, `Failed to ${context}`, error.message);
  }
}

export async function recomputeTenantRisks(tenantId: string) {
  const env = getServerEnv();
  const supabase = createServerSupabaseServiceClient();

  const [identitiesRes, applicationsRes, entitlementsRes, identityEntitlementsRes, eventsRes] = await Promise.all([
    supabase.from("identities").select("*").eq("tenant_id", tenantId),
    supabase.from("applications").select("*").eq("tenant_id", tenantId),
    supabase.from("entitlements").select("*").eq("tenant_id", tenantId),
    supabase.from("identity_entitlements").select("*").eq("tenant_id", tenantId),
    supabase.from("access_events").select("*").eq("tenant_id", tenantId)
  ]);

  assertNoError(identitiesRes.error, "fetch identities");
  assertNoError(applicationsRes.error, "fetch applications");
  assertNoError(entitlementsRes.error, "fetch entitlements");
  assertNoError(identityEntitlementsRes.error, "fetch identity entitlements");
  assertNoError(eventsRes.error, "fetch access events");

  const findings = computeRiskFindings({
    identities: (identitiesRes.data ?? []) as Identity[],
    applications: (applicationsRes.data ?? []) as Application[],
    entitlements: (entitlementsRes.data ?? []) as Entitlement[],
    identityEntitlements: (identityEntitlementsRes.data ?? []) as IdentityEntitlement[],
    accessEvents: (eventsRes.data ?? []) as AccessEvent[],
    privilegeWeightThreshold: env.PRIVILEGE_WEIGHT_THRESHOLD
  });

  const removeRes = await supabase
    .from("risk_findings")
    .delete()
    .eq("tenant_id", tenantId)
    .in("status", ["open", "reviewed"])
    .in("finding_type", ALL_FINDING_TYPES);
  assertNoError(removeRes.error, "remove existing findings");

  if (!findings.length) {
    return { inserted: 0 };
  }

  const insertRes = await supabase.from("risk_findings").insert(
    findings.map((finding) => ({
      tenant_id: tenantId,
      identity_id: finding.identity_id,
      application_id: finding.application_id,
      finding_type: finding.finding_type,
      severity: finding.severity,
      score: finding.score,
      status: "open",
      explanation: null,
      evidence: finding.evidence
    }))
  );

  assertNoError(insertRes.error, "insert recomputed findings");

  return { inserted: findings.length };
}
