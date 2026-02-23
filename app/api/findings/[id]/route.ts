import { ApiError } from "@/lib/errors";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { getFindingWorkspaceDetail } from "@/lib/findings/queries";
import { jsonError, jsonOk } from "@/lib/http";
import { getRequestId, log } from "@/lib/logging";
import { findingIdParamSchema } from "@/lib/findings/validation";

export async function GET(request: Request, context: { params: { id: string } }) {
  const requestId = getRequestId(request.headers);
  const route = "/api/findings/[id]";
  let userId: string | undefined;
  let tenantId: string | undefined;
  let findingId: string | undefined;

  try {
    log("info", { route, requestId, message: "request received" });
    const auth = await requireAuth(request);
    userId = auth.userId;
    tenantId = auth.tenantId;
    requireRole(auth.role, ["admin", "analyst"]);

    const parsed = findingIdParamSchema.safeParse({ id: context.params.id });
    if (!parsed.success) {
      throw new ApiError(400, "Invalid finding id", parsed.error.message, "VALIDATION_ERROR");
    }
    findingId = parsed.data.id;

    const detail = await getFindingWorkspaceDetail(auth.tenantId, parsed.data.id);
    if (!detail) {
      throw new ApiError(404, "Finding not found", "no row for tenant", "NOT_FOUND");
    }

    log("info", {
      route,
      requestId,
      message: "request completed",
      userId: auth.userId,
      tenantId: auth.tenantId,
      findingId: parsed.data.id
    });

    return jsonOk({ finding: detail }, requestId);
  } catch (error) {
    log("error", {
      route,
      requestId,
      message: "finding detail fetch failed",
      user_id: userId ?? null,
      tenant_id: tenantId ?? null,
      finding_id: findingId ?? context.params.id
    });
    return jsonError(error, requestId, route);
  }
}
