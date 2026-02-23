import { ApiError } from "@/lib/errors";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { listTenantFindings } from "@/lib/findings/queries";
import { jsonError, jsonOk } from "@/lib/http";
import { getRequestId, log } from "@/lib/logging";
import { findingsQuerySchema } from "@/lib/schemas";

export async function GET(request: Request) {
  const requestId = getRequestId(request.headers);
  const route = "/api/findings";

  try {
    log("info", { route, requestId, message: "request received" });
    const auth = await requireAuth(request);
    requireRole(auth.role, ["admin", "analyst"]);

    const url = new URL(request.url);
    const parsed = findingsQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      severity: url.searchParams.get("severity") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
      identityId: url.searchParams.get("identityId") ?? undefined
    });

    if (!parsed.success) {
      throw new ApiError(400, "Invalid findings filters", parsed.error.message);
    }

    const findings = await listTenantFindings(auth.tenantId, parsed.data);

    log("info", {
      route,
      requestId,
      message: "request completed",
      userId: auth.userId,
      findingCount: findings.length
    });

    return jsonOk({ findings }, requestId);
  } catch (error) {
    return jsonError(error, requestId, route);
  }
}
