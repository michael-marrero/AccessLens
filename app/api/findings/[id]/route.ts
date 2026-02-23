import { ApiError } from "@/lib/errors";
import { requireAuth, requireRole } from "@/lib/auth/session";
import { getFindingDetail } from "@/lib/findings/queries";
import { jsonError, jsonOk } from "@/lib/http";
import { getRequestId, log } from "@/lib/logging";
import { findingIdSchema } from "@/lib/schemas";

export async function GET(request: Request, context: { params: { id: string } }) {
  const requestId = getRequestId(request.headers);
  const route = "/api/findings/[id]";

  try {
    log("info", { route, requestId, message: "request received" });
    const auth = await requireAuth(request);
    requireRole(auth.role, ["admin", "analyst"]);

    const parsed = findingIdSchema.safeParse({ id: context.params.id });
    if (!parsed.success) {
      throw new ApiError(400, "Invalid finding id", parsed.error.message);
    }

    const finding = await getFindingDetail(auth.tenantId, parsed.data.id);

    log("info", {
      route,
      requestId,
      message: "request completed",
      userId: auth.userId,
      findingId: parsed.data.id
    });

    return jsonOk({ finding }, requestId);
  } catch (error) {
    return jsonError(error, requestId, route);
  }
}
