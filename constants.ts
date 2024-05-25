/**
 * Global version string
 */
export const VERSION = "0.3.0-dev4";

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
 * Fetch timeout
 */
export const FETCH_TIMEOUT = 4_000; // 4 secdonds


/**
 * Initial update interval, this value controls how long the web client hard sleeps.
 * During error conditions the acutal sleep interval can increase dramatically (soft backoff).
 */
export const INITIAL_INTERVAL = 30_000; // Thirty seconds in milliseconds

/**
 * Refresh interval, the amount of time after which the web client considers its data stale.
 * The amount of time passed since the last API checks gets subtracted from this value.
 * After this time has elapsed, the web client will connect to the API to check if fresh data is available.
 */
export const REFRESH_INTERVAL = 3600_000 + 60_000; // One hour and one minute in milliseconds

// Values for testing during development
// const INITIAL_INTERVAL = 5_000; // Five seconds in milliseconds
// const REFRESH_INTERVAL = 10_000; // Ten seconds in milliseconds