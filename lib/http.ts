import { NextResponse } from "next/server";
import { asApiError } from "@/lib/errors";
import { log } from "@/lib/logging";

export function jsonOk(data: unknown, requestId: string, init?: ResponseInit) {
  return NextResponse.json({ requestId, data }, init);
}

export function jsonError(error: unknown, requestId: string, route: string) {
  const apiError = asApiError(error);
  log("error", {
    route,
    requestId,
    code: apiError.code,
    message: apiError.message,
    safeMessage: apiError.safeMessage,
    statusCode: apiError.statusCode
  });

  return NextResponse.json(
    {
      requestId,
      code: apiError.code,
      message: apiError.safeMessage,
      error: apiError.safeMessage
    },
    { status: apiError.statusCode }
  );
}
