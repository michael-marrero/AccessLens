export class ApiError extends Error {
  statusCode: number;
  safeMessage: string;

  constructor(statusCode: number, safeMessage: string, message?: string) {
    super(message ?? safeMessage);
    this.statusCode = statusCode;
    this.safeMessage = safeMessage;
  }
}

export function asApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError(500, "Unexpected server error", error instanceof Error ? error.message : "unknown error");
}
