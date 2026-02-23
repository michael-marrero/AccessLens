import { redirect } from "next/navigation";
import { ApiError } from "@/lib/errors";
import type { ProfileRole } from "@/lib/types";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";
import { createServerComponentSupabaseClient } from "@/lib/supabase/server-component";

export type PageAuthContext = {
  userId: string;
  email: string | null;
  tenantId: string;
  role: ProfileRole;
  fullName: string;
};

export async function requirePageAuth(allowedRoles: ProfileRole[] = ["admin", "analyst"]): Promise<PageAuthContext> {
  const browserScoped = createServerComponentSupabaseClient();
  const {
    data: { user },
    error: userError
  } = await browserScoped.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const service = createServerSupabaseServiceClient();
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("id, tenant_id, role, full_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    throw new ApiError(403, "No profile linked to this user", profileError?.message, "PROFILE_NOT_FOUND");
  }

  if (!allowedRoles.includes(profile.role)) {
    throw new ApiError(403, "You do not have access to this resource", "role denied", "FORBIDDEN");
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    tenantId: profile.tenant_id,
    role: profile.role,
    fullName: profile.full_name
  };
}
