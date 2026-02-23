import { ApiError } from "@/lib/errors";
import type { ProfileRole } from "@/lib/types";
import { createServerSupabaseAnonClient, createServerSupabaseServiceClient } from "@/lib/supabase/server";

export type AuthContext = {
  userId: string;
  email: string | null;
  tenantId: string;
  role: ProfileRole;
  fullName: string;
};

function getBearerToken(authorization: string | null) {
  if (!authorization) {
    return null;
  }

  const [type, token] = authorization.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export async function requireAuth(request: Request): Promise<AuthContext> {
  const token = getBearerToken(request.headers.get("authorization"));
  if (!token) {
    throw new ApiError(401, "Authentication required", "missing bearer token");
  }

  const anon = createServerSupabaseAnonClient();
  const { data: userData, error: userError } = await anon.auth.getUser(token);
  if (userError || !userData.user) {
    throw new ApiError(401, "Invalid authentication token", userError?.message);
  }

  const service = createServerSupabaseServiceClient();
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("id, tenant_id, role, full_name")
    .eq("id", userData.user.id)
    .single();

  if (profileError || !profile) {
    throw new ApiError(403, "No profile linked to this user", profileError?.message);
  }

  return {
    userId: userData.user.id,
    email: userData.user.email ?? null,
    tenantId: profile.tenant_id,
    role: profile.role,
    fullName: profile.full_name
  };
}

export function requireRole(role: ProfileRole, allowed: ProfileRole[]) {
  if (!allowed.includes(role)) {
    throw new ApiError(403, "You do not have access to this resource", `required role in ${allowed.join(",")}`);
  }
}
