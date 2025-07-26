// server/api/handlers.ts - Shared API utilities and helpers

/**
 * Standard API response format
 */
export interface APIResponse<T = unknown> {
  data?: T;
  error?: string;
  version: string;
}

/**
 * Create a standardized JSON response
 */
export function createAPIResponse<T>(
  data: T,
  version: string,
): Response {
  return Response.json({
    data,
    version,
  });
}

/**
 * Create a standardized error response
 */
export function createAPIErrorResponse(
  error: string,
  version: string,
  status = 500,
): Response {
  return Response.json(
    {
      error,
      version,
    },
    { status },
  );
}

/**
 * Common error handler for API routes
 */
export function handleAPIError(error: unknown, version: string): Response {
  console.error("API error:", error);

  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  return createAPIErrorResponse(`Internal server error: ${errorMessage}`, version);
}
