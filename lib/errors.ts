export class ApiError extends Error {
  statusCode: number;
  safeMessage: string;
  code: string;

  constructor(statusCode: number, safeMessage: string, message?: string, code?: string) {
    super(message ?? safeMessage);
    this.statusCode = statusCode;
    this.safeMessage = safeMessage;
    this.code = code ?? statusCodeToCode(statusCode);
  }
}

function statusCodeToCode(statusCode: number) {
  if (statusCode === 400) return "BAD_REQUEST";
  if (statusCode === 401) return "UNAUTHORIZED";
  if (statusCode === 403) return "FORBIDDEN";
  if (statusCode === 404) return "NOT_FOUND";
  if (statusCode === 409) return "CONFLICT";
  if (statusCode === 422) return "UNPROCESSABLE_ENTITY";
  return "INTERNAL_ERROR";
}

export function asApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError(
    500,
    "Unexpected server error",
    error instanceof Error ? error.message : "unknown error",
    "INTERNAL_ERROR"
  );
}
