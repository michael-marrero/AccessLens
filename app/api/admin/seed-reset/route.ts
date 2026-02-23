import { ApiError } from "@/lib/errors";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";
import { getRequestId, log } from "@/lib/logging";
import { resetAndSeedDemoData } from "@/lib/seed/demo-seed";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";

async function ensureUserByEmail(email: string, password: string) {
  const supabase = createServerSupabaseServiceClient();

  const listRes = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listRes.error) {
    throw new ApiError(500, "Failed to list users", listRes.error.message);
  }

  const existing = listRes.data.users.find((user) => user.email === email);
  if (existing) {
    return existing.id;
  }

  const createRes = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (createRes.error || !createRes.data.user) {
    throw new ApiError(500, `Failed to create ${email}`, createRes.error?.message);
  }

  return createRes.data.user.id;
}

export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);
  const route = "/api/admin/seed-reset";

  try {
    log("info", { route, requestId, message: "request received" });

    const env = getServerEnv();
    if (env.NODE_ENV === "production") {
      throw new ApiError(403, "Demo seed reset is disabled in production");
    }

    const auth = await requireAuth(request);
    requireRole(auth.role, ["admin"]);

    const analystUserId = await ensureUserByEmail("analyst@accesslens.local", "Password123!");

    const result = await resetAndSeedDemoData({
      tenantId: auth.tenantId,
      adminUserId: auth.userId,
      analystUserId,
      tenantName: "AccessLens Demo Tenant"
    });

    log("info", {
      route,
      requestId,
      message: "request completed",
      userId: auth.userId,
      findingsInserted: result.findingsInserted
    });

    return jsonOk(result, requestId, { status: 201 });
  } catch (error) {
    return jsonError(error, requestId, route);
  }
}
