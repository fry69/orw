/**
 * Global version string
 */
export const ORW_VERSION = "0.6.0";
export const VERSION = ORW_VERSION; // Alias for backwards compatibility

/**
 * API version number, server and client must match to be considered valid
 */
export const API_VERSION = 3;

/**
 * API endpoints
 */
export const API__LISTS = "/api/lists";
export const API__STATUS = "/api/status";

/**
 * OpenRouter API URL
 */
export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/models";

/**
 * Main watcher check interval
 */
export const POLLING_INTERVAL_MS = 3_600_000; // 1 hour in milliseconds

/**
 * Fetch timeout
 */
export const FETCH_TIMEOUT_MS = 4_000; // 4 secdonds

/**
 * Initial update interval, this value controls how long the web client hard sleeps.
 * During error conditions the acutal sleep interval can increase dramatically (soft backoff).
 */
export const INITIAL_INTERVAL_MS = 30_000; // Thirty seconds in milliseconds

/**
 * Refresh interval, the amount of time after which the web client considers its data stale.
 * The amount of time passed since the last API checks gets subtracted from this value.
 * After this time has elapsed, the web client will connect to the API to check if fresh data is available.
 */
export const REFRESH_INTERVAL_MS = POLLING_INTERVAL_MS + 60_000; // Check interval plus one minute in milliseconds

// Values for testing during development
// const INITIAL_INTERVAL = 5_000; // Five seconds in milliseconds
// const REFRESH_INTERVAL = 10_000; // Ten seconds in milliseconds
