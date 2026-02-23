import { ApiError } from "@/lib/errors";
import { requireAuth, requireRole, type AuthContext } from "@/lib/auth/session";
import { executeFindingAction, type FindingActionDeps } from "@/lib/findings/actions";
import { getFindingWorkspaceDetail } from "@/lib/findings/queries";
import { findingActionPayloadSchema, findingIdParamSchema } from "@/lib/findings/validation";
import { jsonError, jsonOk } from "@/lib/http";
import { getRequestId, log } from "@/lib/logging";
import { createServerSupabaseServiceClient } from "@/lib/supabase/server";
import type { FindingPriority } from "@/lib/types";

export function createFindingActionDeps(): FindingActionDeps {
  const supabase = createServerSupabaseServiceClient();

  return {
    async getFindingById(tenantId, findingId) {
      const res = await supabase
        .from("risk_findings")
        .select("id, tenant_id, status, severity, assigned_to, priority, due_at, disposition")
        .eq("tenant_id", tenantId)
        .eq("id", findingId)
        .single();

      if (res.error || !res.data) {
        return null;
      }

      return {
        ...res.data,
        priority: res.data.priority as FindingPriority | null
      };
    },
    async getProfileById(tenantId, profileId) {
      const res = await supabase
        .from("profiles")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("id", profileId)
        .single();

      if (res.error || !res.data) {
        return null;
      }

      return res.data;
    },
    async updateFindingById(tenantId, findingId, patch) {
      const res = await supabase
        .from("risk_findings")
        .update(patch)
        .eq("tenant_id", tenantId)
        .eq("id", findingId)
        .select("id, tenant_id, status, severity, assigned_to, priority, due_at, disposition")
        .single();

      if (res.error || !res.data) {
        throw new ApiError(500, "Failed to update finding", res.error?.message, "UPDATE_FAILED");
      }

      return {
        ...res.data,
        priority: res.data.priority as FindingPriority | null
      };
    },
    async insertReviewAction(params) {
      const res = await supabase.from("review_actions").insert({
        tenant_id: params.tenantId,
        finding_id: params.findingId,
        actor_user_id: params.actorUserId,
        action: params.action,
        note: params.note,
        previous_status: params.previousStatus,
        new_status: params.newStatus,
        metadata: params.metadata
      });

      if (res.error) {
        throw new ApiError(500, "Failed to create audit record", res.error.message, "AUDIT_INSERT_FAILED");
      }
    }
  };
}

export function buildPostFindingActionHandler(depsFactory: () => FindingActionDeps) {
  return async function POST(request: Request, context: { params: { id: string } }) {
    const requestId = getRequestId(request.headers);
    const route = "/api/findings/[id]/action";

    let auth: AuthContext | null = null;
    let findingId: string | null = null;

    try {
      log("info", { route, requestId, message: "request received" });

      auth = await requireAuth(request);
      requireRole(auth.role, ["admin", "analyst"]);

      const idParsed = findingIdParamSchema.safeParse({ id: context.params.id });
      if (!idParsed.success) {
        throw new ApiError(400, "Invalid finding id", idParsed.error.message, "VALIDATION_ERROR");
      }
      findingId = idParsed.data.id;

      const body = await request.json().catch(() => {
        throw new ApiError(400, "Request body must be valid JSON", "json parse failure", "VALIDATION_ERROR");
      });
      const payloadParsed = findingActionPayloadSchema.safeParse(body);
      if (!payloadParsed.success) {
        throw new ApiError(400, "Invalid action payload", payloadParsed.error.message, "VALIDATION_ERROR");
      }

      const actionResult = await executeFindingAction(depsFactory(), {
        tenantId: auth.tenantId,
        findingId,
        actorUserId: auth.userId,
        actorRole: auth.role,
        payload: payloadParsed.data
      });

      const detail = await getFindingWorkspaceDetail(auth.tenantId, findingId);
      if (!detail) {
        throw new ApiError(404, "Finding not found", "finding disappeared after update", "NOT_FOUND");
      }

      log("info", {
        route,
        requestId,
        message: "request completed",
        actor: auth.userId,
        tenant_id: auth.tenantId,
        finding_id: findingId,
        changes: actionResult.changes,
        previous_status: actionResult.previousStatus,
        new_status: actionResult.newStatus
      });

      return jsonOk(
        {
          finding: detail,
          changes: actionResult.changes,
          previousStatus: actionResult.previousStatus,
          newStatus: actionResult.newStatus
        },
        requestId
      );
    } catch (error) {
      log("error", {
        route,
        requestId,
        message: "finding action failed",
        actor: auth?.userId ?? null,
        tenant_id: auth?.tenantId ?? null,
        finding_id: findingId ?? context.params.id
      });

      return jsonError(error, requestId, route);
    }
  };
}
