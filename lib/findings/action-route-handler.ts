import { ApiError } from "@/lib/errors";
import { requireAuth, requireRole, type AuthContext } from "@/lib/auth/session";
import { executeFindingAction, type ExecuteFindingActionDeps } from "@/lib/findings/action-service";
import { jsonError, jsonOk } from "@/lib/http";
import { getRequestId, log } from "@/lib/logging";
import { findingActionSchema, findingIdSchema } from "@/lib/schemas";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";

export function createFindingActionDeps(): ExecuteFindingActionDeps {
  const supabase = createServerSupabaseServiceClient();

  return {
    async getFindingById(tenantId, findingId) {
      const res = await supabase
        .from("risk_findings")
        .select("id, tenant_id, status")
        .eq("tenant_id", tenantId)
        .eq("id", findingId)
        .single();
      if (res.error || !res.data) {
        return null;
      }

      return res.data;
    },
    async insertReviewAction({ tenantId, findingId, actorUserId, action, note }) {
      const res = await supabase.from("review_actions").insert({
        tenant_id: tenantId,
        finding_id: findingId,
        actor_user_id: actorUserId,
        action,
        note
      });

      if (res.error) {
        throw new ApiError(500, "Failed to write audit action", res.error.message);
      }
    },
    async updateFindingStatus(tenantId, findingId, status) {
      const res = await supabase
        .from("risk_findings")
        .update({ status })
        .eq("tenant_id", tenantId)
        .eq("id", findingId);
      if (res.error) {
        throw new ApiError(500, "Failed to update finding status", res.error.message);
      }
    }
  };
}

export function buildPostFindingActionHandler(depsFactory: () => ExecuteFindingActionDeps) {
  return async function POST(request: Request, context: { params: { id: string } }) {
    const requestId = getRequestId(request.headers);
    const route = "/api/findings/[id]/action";

    try {
      log("info", { route, requestId, message: "request received" });

      const auth: AuthContext = await requireAuth(request);
      requireRole(auth.role, ["admin", "analyst"]);

      const idParsed = findingIdSchema.safeParse({ id: context.params.id });
      if (!idParsed.success) {
        throw new ApiError(400, "Invalid finding id", idParsed.error.message);
      }

      const body = await request.json().catch(() => {
        throw new ApiError(400, "Request body must be valid JSON");
      });
      const bodyParsed = findingActionSchema.safeParse(body);
      if (!bodyParsed.success) {
        throw new ApiError(400, "Invalid action payload", bodyParsed.error.message);
      }

      const result = await executeFindingAction(depsFactory(), {
        tenantId: auth.tenantId,
        findingId: idParsed.data.id,
        actorUserId: auth.userId,
        actorRole: auth.role,
        action: bodyParsed.data.action,
        note: bodyParsed.data.note
      });

      log("info", {
        route,
        requestId,
        message: "request completed",
        userId: auth.userId,
        findingId: idParsed.data.id,
        action: result.action
      });

      return jsonOk(result, requestId, { status: 201 });
    } catch (error) {
      return jsonError(error, requestId, route);
    }
  };
}
