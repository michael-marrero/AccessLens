import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { resetAndSeedDemoData } from "../lib/seed/demo-seed";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DEMO_TENANT_ID: z.string().uuid().default("11111111-1111-1111-1111-111111111111")
});

const DEFAULT_PASSWORD = "Password123!";

async function findOrCreateUser(supabase: any, email: string) {
  const listRes = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listRes.error) {
    throw new Error(`Failed to list users: ${listRes.error.message}`);
  }

  const existing = listRes.data.users.find((user: { email?: string | null; id: string }) => user.email === email);
  if (existing) {
    return existing.id;
  }

  const created = await supabase.auth.admin.createUser({
    email,
    password: DEFAULT_PASSWORD,
    email_confirm: true
  });

  if (created.error || !created.data.user) {
    throw new Error(`Failed to create user ${email}: ${created.error?.message ?? "unknown"}`);
  }

  return created.data.user.id;
}

async function main() {
  const env = envSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DEMO_TENANT_ID: process.env.DEMO_TENANT_ID
  });

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });

  const adminUserId = await findOrCreateUser(supabase, "admin@accesslens.local");
  const analystUserId = await findOrCreateUser(supabase, "analyst@accesslens.local");

  const seeded = await resetAndSeedDemoData({
    supabase,
    tenantId: env.DEMO_TENANT_ID,
    adminUserId,
    analystUserId,
    tenantName: "AccessLens Demo Tenant"
  });

  console.log(JSON.stringify({ status: "ok", ...seeded }, null, 2));
  console.log("Demo users");
  console.log("  admin@accesslens.local / Password123!");
  console.log("  analyst@accesslens.local / Password123!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
