import { getRequestId, log } from "@/lib/logging";
import { requireAuth } from "@/lib/auth/session";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(request: Request) {
  const requestId = getRequestId(request.headers);
  const route = "/api/me";

  try {
    log("info", { route, requestId, message: "request received" });
    const auth = await requireAuth(request);
    log("info", { route, requestId, message: "request completed", userId: auth.userId });
    return jsonOk(auth, requestId);
  } catch (error) {
    return jsonError(error, requestId, route);
  }
}
