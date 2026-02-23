import { ApiError } from "@/lib/errors";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { recomputeTenantRisks } from "@/lib/risk/recompute";
import { jsonError, jsonOk } from "@/lib/http";
import { getRequestId, log } from "@/lib/logging";
import { recomputeBodySchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const requestId = getRequestId(request.headers);
  const route = "/api/risk/recompute";

  try {
    log("info", { route, requestId, message: "request received" });
    const auth = await requireAuth(request);
    requireRole(auth.role, ["admin"]);

    const body = await request.json().catch(() => ({}));
    const parsed = recomputeBodySchema.safeParse(body);

    if (!parsed.success) {
      throw new ApiError(400, "Invalid recompute payload", parsed.error.message);
    }

    const tenantId = parsed.data.tenantId ?? auth.tenantId;
    const result = await recomputeTenantRisks(tenantId);

    log("info", {
      route,
      requestId,
      message: "request completed",
      userId: auth.userId,
      tenantId,
      inserted: result.inserted
    });

    return jsonOk(result, requestId, { status: 201 });
  } catch (error) {
    return jsonError(error, requestId, route);
  }
}
