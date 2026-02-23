import { ApiError } from "@/lib/errors";
import { recomputeTenantRisks } from "@/lib/risk/recompute";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";

const nowIso = () => new Date().toISOString();
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const APPS = {
  erp: "aaaa1111-1111-1111-1111-111111111111",
  aws: "bbbb2222-2222-2222-2222-222222222222",
  github: "cccc3333-3333-3333-3333-333333333333",
  workday: "dddd4444-4444-4444-4444-444444444444"
} as const;

const IDENTITIES = {
  dormantPrivileged: "11111111-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  serviceCi: "22222222-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
  financeManager: "33333333-cccc-4ccc-8ccc-ccccccccccc3",
  engineer: "44444444-dddd-4ddd-8ddd-ddddddddddd4",
  activeAdmin: "55555555-eeee-4eee-8eee-eeeeeeeeeee5"
} as const;

const ENTITLEMENTS = {
  createVendor: "11111111-9999-4999-8999-999999999991",
  approvePayment: "22222222-9999-4999-8999-999999999992",
  awsAdmin: "33333333-9999-4999-8999-999999999993",
  githubOwner: "44444444-9999-4999-8999-999999999994",
  payrollAdmin: "55555555-9999-4999-8999-999999999995",
  prodDeploy: "66666666-9999-4999-8999-999999999996",
  supportReadOnly: "77777777-9999-4999-8999-999999999997"
} as const;

const GRANTS = {
  fmCreateVendor: "aaaa7777-1111-4111-8111-111111111111",
  fmApprovePayment: "bbbb7777-2222-4222-8222-222222222222",
  fmAwsAdmin: "cccc7777-3333-4333-8333-333333333333",
  fmGitHubOwner: "dddd7777-4444-4444-8444-444444444444",
  fmPayroll: "eeee7777-5555-4555-8555-555555555555",
  serviceAws: "ffff7777-6666-4666-8666-666666666666",
  engineerSupport: "11117777-7777-4777-8777-777777777777",
  engineerProdDeployRecent: "22227777-8888-4888-8888-888888888888",
  dormantAws: "33337777-9999-4999-8999-999999999999",
  activeAdminAws: "44447777-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
} as const;

function assertNoError(error: { message: string } | null, message: string) {
  if (error) {
    throw new ApiError(500, message, error.message);
  }
}

export async function resetAndSeedDemoData(options: {
  supabase?: any;
  tenantId: string;
  adminUserId: string;
  analystUserId: string;
  tenantName?: string;
}) {
  const supabase = options.supabase ?? createServerSupabaseServiceClient();
  const tenantName = options.tenantName ?? "AccessLens Demo Tenant";

  const tenantUpsert = await supabase.from("tenants").upsert({ id: options.tenantId, name: tenantName }, { onConflict: "id" });
  assertNoError(tenantUpsert.error, "failed to upsert tenant");

  const cleanupTables = [
    "review_actions",
    "risk_findings",
    "access_events",
    "identity_entitlements",
    "entitlements",
    "identities",
    "applications",
    "profiles"
  ];

  for (const table of cleanupTables) {
    const removeRes = await supabase.from(table).delete().eq("tenant_id", options.tenantId);
    assertNoError(removeRes.error, `failed to clear ${table}`);
  }

  const profileInsert = await supabase.from("profiles").insert([
    {
      id: options.adminUserId,
      tenant_id: options.tenantId,
      role: "admin",
      full_name: "Alex Admin"
    },
    {
      id: options.analystUserId,
      tenant_id: options.tenantId,
      role: "analyst",
      full_name: "Sam Analyst"
    }
  ]);
  assertNoError(profileInsert.error, "failed to seed profiles");

  const appsInsert = await supabase.from("applications").insert([
    { id: APPS.erp, tenant_id: options.tenantId, name: "FinERP", category: "Finance" },
    { id: APPS.aws, tenant_id: options.tenantId, name: "AWS", category: "Cloud" },
    { id: APPS.github, tenant_id: options.tenantId, name: "GitHub", category: "Engineering" },
    { id: APPS.workday, tenant_id: options.tenantId, name: "Workday", category: "HR" }
  ]);
  assertNoError(appsInsert.error, "failed to seed applications");

  const entitlementsInsert = await supabase.from("entitlements").insert([
    { id: ENTITLEMENTS.createVendor, tenant_id: options.tenantId, application_id: APPS.erp, name: "create_vendor", privilege_weight: 45 },
    { id: ENTITLEMENTS.approvePayment, tenant_id: options.tenantId, application_id: APPS.erp, name: "approve_payment", privilege_weight: 50 },
    { id: ENTITLEMENTS.awsAdmin, tenant_id: options.tenantId, application_id: APPS.aws, name: "aws_admin", privilege_weight: 70 },
    { id: ENTITLEMENTS.githubOwner, tenant_id: options.tenantId, application_id: APPS.github, name: "github_owner", privilege_weight: 35 },
    { id: ENTITLEMENTS.payrollAdmin, tenant_id: options.tenantId, application_id: APPS.workday, name: "payroll_admin", privilege_weight: 30 },
    { id: ENTITLEMENTS.prodDeploy, tenant_id: options.tenantId, application_id: APPS.github, name: "prod_deploy", privilege_weight: 55 },
    { id: ENTITLEMENTS.supportReadOnly, tenant_id: options.tenantId, application_id: APPS.github, name: "support_readonly", privilege_weight: 8 }
  ]);
  assertNoError(entitlementsInsert.error, "failed to seed entitlements");

  const identitiesInsert = await supabase.from("identities").insert([
    {
      id: IDENTITIES.dormantPrivileged,
      tenant_id: options.tenantId,
      type: "human",
      name: "Dana Dormant",
      email: "dana.dormant@accesslens.local",
      privilege_level: 9,
      is_privileged: true
    },
    {
      id: IDENTITIES.serviceCi,
      tenant_id: options.tenantId,
      type: "service",
      name: "svc-ci-pipeline",
      email: null,
      privilege_level: 7,
      is_privileged: true
    },
    {
      id: IDENTITIES.financeManager,
      tenant_id: options.tenantId,
      type: "human",
      name: "Fiona Finance",
      email: "fiona.finance@accesslens.local",
      privilege_level: 8,
      is_privileged: true
    },
    {
      id: IDENTITIES.engineer,
      tenant_id: options.tenantId,
      type: "human",
      name: "Evan Engineer",
      email: "evan.engineer@accesslens.local",
      privilege_level: 6,
      is_privileged: false
    },
    {
      id: IDENTITIES.activeAdmin,
      tenant_id: options.tenantId,
      type: "human",
      name: "Ada Active",
      email: "ada.active@accesslens.local",
      privilege_level: 9,
      is_privileged: true
    }
  ]);
  assertNoError(identitiesInsert.error, "failed to seed identities");

  const grantsInsert = await supabase.from("identity_entitlements").insert([
    {
      id: GRANTS.fmCreateVendor,
      tenant_id: options.tenantId,
      identity_id: IDENTITIES.financeManager,
      entitlement_id: ENTITLEMENTS.createVendor,
      granted_at: daysAgo(30),
      granted_by: options.adminUserId
    },
    {
      id: GRANTS.fmApprovePayment,
      tenant_id: options.tenantId,
      identity_id: IDENTITIES.financeManager,
      entitlement_id: ENTITLEMENTS.approvePayment,
      granted_at: daysAgo(30),
      granted_by: options.adminUserId
    },
    {
      id: GRANTS.fmAwsAdmin,
      tenant_id: options.tenantId,
      identity_id: IDENTITIES.financeManager,
      entitlement_id: ENTITLEMENTS.awsAdmin,
      granted_at: daysAgo(30),
      granted_by: options.adminUserId
    },
    {
      id: GRANTS.fmGitHubOwner,
      tenant_id: options.tenantId,
      identity_id: IDENTITIES.financeManager,
      entitlement_id: ENTITLEMENTS.githubOwner,
      granted_at: daysAgo(30),
      granted_by: options.adminUserId
    },
    {
      id: GRANTS.fmPayroll,
      tenant_id: options.tenantId,
      identity_id: IDENTITIES.financeManager,
      entitlement_id: ENTITLEMENTS.payrollAdmin,
      granted_at: daysAgo(30),
      granted_by: options.adminUserId
    },
    {
      id: GRANTS.serviceAws,
      tenant_id: options.tenantId,
      identity_id: IDENTITIES.serviceCi,
      entitlement_id: ENTITLEMENTS.awsAdmin,
      granted_at: daysAgo(120),
      granted_by: options.adminUserId
    },
    {
      id: GRANTS.engineerSupport,
      tenant_id: options.tenantId,
      identity_id: IDENTITIES.engineer,
      entitlement_id: ENTITLEMENTS.supportReadOnly,
      granted_at: daysAgo(70),
      granted_by: options.adminUserId
    },
    {
      id: GRANTS.engineerProdDeployRecent,
      tenant_id: options.tenantId,
      identity_id: IDENTITIES.engineer,
      entitlement_id: ENTITLEMENTS.prodDeploy,
      granted_at: daysAgo(3),
      granted_by: options.adminUserId
    },
    {
      id: GRANTS.dormantAws,
      tenant_id: options.tenantId,
      identity_id: IDENTITIES.dormantPrivileged,
      entitlement_id: ENTITLEMENTS.awsAdmin,
      granted_at: daysAgo(365),
      granted_by: options.adminUserId
    },
    {
      id: GRANTS.activeAdminAws,
      tenant_id: options.tenantId,
      identity_id: IDENTITIES.activeAdmin,
      entitlement_id: ENTITLEMENTS.awsAdmin,
      granted_at: daysAgo(200),
      granted_by: options.adminUserId
    }
  ]);
  assertNoError(grantsInsert.error, "failed to seed identity entitlements");

  const accessEventsInsert = await supabase.from("access_events").insert([
    {
      id: crypto.randomUUID(),
      tenant_id: options.tenantId,
      identity_id: IDENTITIES.dormantPrivileged,
      application_id: APPS.aws,
      event_type: "interactive_login",
      ip_address: "203.0.113.10",
      country: "US",
      ts: daysAgo(170),
      success: true,
      metadata: { mfa: true }
    },
    {
      id: crypto.randomUUID(),
      tenant_id: options.tenantId,
      identity_id: IDENTITIES.serviceCi,
      application_id: APPS.aws,
      event_type: "interactive_login",
      ip_address: "203.0.113.11",
      country: "US",
      ts: daysAgo(1),
      success: true,
      metadata: { console: true }
    },
    {
      id: crypto.randomUUID(),
      tenant_id: options.tenantId,
      identity_id: IDENTITIES.financeManager,
      application_id: APPS.erp,
      event_type: "interactive_login",
      ip_address: "203.0.113.12",
      country: "US",
      ts: daysAgo(2),
      success: true,
      metadata: { mfa: true }
    },
    {
      id: crypto.randomUUID(),
      tenant_id: options.tenantId,
      identity_id: IDENTITIES.financeManager,
      application_id: APPS.erp,
      event_type: "interactive_login",
      ip_address: "203.0.113.13",
      country: "US",
      ts: daysAgo(11),
      success: true,
      metadata: { mfa: true }
    },
    {
      id: crypto.randomUUID(),
      tenant_id: options.tenantId,
      identity_id: IDENTITIES.engineer,
      application_id: APPS.github,
      event_type: "interactive_login",
      ip_address: "198.51.100.14",
      country: "US",
      ts: daysAgo(20),
      success: true,
      metadata: { mfa: true }
    },
    {
      id: crypto.randomUUID(),
      tenant_id: options.tenantId,
      identity_id: IDENTITIES.engineer,
      application_id: APPS.github,
      event_type: "interactive_login",
      ip_address: "198.51.100.15",
      country: "DE",
      ts: daysAgo(1),
      success: true,
      metadata: { mfa: false }
    },
    {
      id: crypto.randomUUID(),
      tenant_id: options.tenantId,
      identity_id: IDENTITIES.activeAdmin,
      application_id: APPS.aws,
      event_type: "interactive_login",
      ip_address: "198.51.100.16",
      country: "US",
      ts: nowIso(),
      success: true,
      metadata: { mfa: true }
    }
  ]);
  assertNoError(accessEventsInsert.error, "failed to seed access events");

  const recomputed = await recomputeTenantRisks(options.tenantId);

  return {
    tenantId: options.tenantId,
    findingsInserted: recomputed.inserted
  };
}
