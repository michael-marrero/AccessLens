import { describe, expect, it } from "vitest";
import { FINDING_TYPES } from "@/lib/risk/constants";
import { computeRiskFindings } from "@/lib/risk/rules";
import type { AccessEvent, Application, Entitlement, Identity, IdentityEntitlement } from "@/lib/types";

const now = new Date("2026-02-23T00:00:00.000Z");

const identities: Identity[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    tenant_id: "tenant",
    type: "human",
    name: "Dormant Privileged",
    email: "dormant@example.com",
    privilege_level: 9,
    is_privileged: true,
    created_at: now.toISOString()
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    tenant_id: "tenant",
    type: "service",
    name: "svc-api",
    email: null,
    privilege_level: 6,
    is_privileged: true,
    created_at: now.toISOString()
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    tenant_id: "tenant",
    type: "human",
    name: "Finance User",
    email: "finance@example.com",
    privilege_level: 8,
    is_privileged: true,
    created_at: now.toISOString()
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    tenant_id: "tenant",
    type: "human",
    name: "Engineer",
    email: "eng@example.com",
    privilege_level: 4,
    is_privileged: false,
    created_at: now.toISOString()
  }
];

const applications: Application[] = [
  {
    id: "app-erp",
    tenant_id: "tenant",
    name: "ERP",
    category: "Finance",
    created_at: now.toISOString()
  },
  {
    id: "app-gh",
    tenant_id: "tenant",
    name: "GitHub",
    category: "Engineering",
    created_at: now.toISOString()
  }
];

const entitlements: Entitlement[] = [
  {
    id: "ent-create-vendor",
    tenant_id: "tenant",
    application_id: "app-erp",
    name: "create_vendor",
    privilege_weight: 45,
    created_at: now.toISOString()
  },
  {
    id: "ent-approve-payment",
    tenant_id: "tenant",
    application_id: "app-erp",
    name: "approve_payment",
    privilege_weight: 50,
    created_at: now.toISOString()
  },
  {
    id: "ent-admin",
    tenant_id: "tenant",
    application_id: "app-gh",
    name: "repo_admin",
    privilege_weight: 40,
    created_at: now.toISOString()
  },
  {
    id: "ent-recent",
    tenant_id: "tenant",
    application_id: "app-gh",
    name: "prod_deploy",
    privilege_weight: 20,
    created_at: now.toISOString()
  }
];

const identityEntitlements: IdentityEntitlement[] = [
  {
    id: "grant-1",
    tenant_id: "tenant",
    identity_id: "33333333-3333-4333-8333-333333333333",
    entitlement_id: "ent-create-vendor",
    granted_at: "2026-02-01T00:00:00.000Z",
    granted_by: null
  },
  {
    id: "grant-2",
    tenant_id: "tenant",
    identity_id: "33333333-3333-4333-8333-333333333333",
    entitlement_id: "ent-approve-payment",
    granted_at: "2026-02-01T00:00:00.000Z",
    granted_by: null
  },
  {
    id: "grant-3",
    tenant_id: "tenant",
    identity_id: "33333333-3333-4333-8333-333333333333",
    entitlement_id: "ent-admin",
    granted_at: "2026-02-01T00:00:00.000Z",
    granted_by: null
  },
  {
    id: "grant-4",
    tenant_id: "tenant",
    identity_id: "44444444-4444-4444-8444-444444444444",
    entitlement_id: "ent-recent",
    granted_at: "2026-02-20T00:00:00.000Z",
    granted_by: null
  }
];

const accessEvents: AccessEvent[] = [
  {
    id: "evt-1",
    tenant_id: "tenant",
    identity_id: "11111111-1111-4111-8111-111111111111",
    application_id: "app-gh",
    event_type: "interactive_login",
    ip_address: "192.0.2.1",
    country: "US",
    ts: "2025-08-01T00:00:00.000Z",
    success: true,
    metadata: {}
  },
  {
    id: "evt-2",
    tenant_id: "tenant",
    identity_id: "22222222-2222-4222-8222-222222222222",
    application_id: "app-gh",
    event_type: "interactive_login",
    ip_address: "192.0.2.2",
    country: "US",
    ts: "2026-02-22T00:00:00.000Z",
    success: true,
    metadata: {}
  },
  {
    id: "evt-3",
    tenant_id: "tenant",
    identity_id: "44444444-4444-4444-8444-444444444444",
    application_id: "app-gh",
    event_type: "interactive_login",
    ip_address: "192.0.2.3",
    country: "US",
    ts: "2026-02-10T00:00:00.000Z",
    success: true,
    metadata: {}
  },
  {
    id: "evt-4",
    tenant_id: "tenant",
    identity_id: "44444444-4444-4444-8444-444444444444",
    application_id: "app-gh",
    event_type: "interactive_login",
    ip_address: "192.0.2.4",
    country: "DE",
    ts: "2026-02-21T00:00:00.000Z",
    success: true,
    metadata: {}
  }
];

describe("computeRiskFindings", () => {
  it("detects all MVP rule finding types", () => {
    const findings = computeRiskFindings({
      identities,
      applications,
      entitlements,
      identityEntitlements,
      accessEvents,
      now,
      privilegeWeightThreshold: 100
    });

    const findingTypes = new Set(findings.map((finding) => finding.finding_type));

    expect(findingTypes.has(FINDING_TYPES.DORMANT_PRIVILEGED_ACCOUNT)).toBe(true);
    expect(findingTypes.has(FINDING_TYPES.SERVICE_INTERACTIVE_LOGIN_ANOMALY)).toBe(true);
    expect(findingTypes.has(FINDING_TYPES.EXCESSIVE_PRIVILEGE_COUNT)).toBe(true);
    expect(findingTypes.has(FINDING_TYPES.TOXIC_COMBINATION)).toBe(true);
    expect(findingTypes.has(FINDING_TYPES.NEW_PRIVILEGE_UNUSUAL_COUNTRY)).toBe(true);
  });
});
