import { createDefine } from "fresh";
import type { AppConfig, Lists, WatcherStatus } from "./lib/types.ts";

export interface State {
  commonData?: {
    config: AppConfig;
    status: WatcherStatus;
    lists: Lists;
    pathname: string;
  };
}

export const define = createDefine<State>();

/**
 * Cached configuration to avoid repeated validation and warnings
 */
let _cachedConfig: AppConfig | null = null;
let _configInitialized = false;

/**
 * Initialize application configuration with validation and warnings
 * This runs only once to avoid console spam
 */
function initializeAppConfig(): AppConfig {
  if (_configInitialized && _cachedConfig) {
    return _cachedConfig;
  }

  // Public URL validation
  const publicUrl = Deno.env.get("ORW_PUBLIC_URL");
  if (!publicUrl) {
    throw new Error("❌ ORW_PUBLIC_URL environment variable is required");
  }

  // Repository URL (optional)
  const repositoryUrl = Deno.env.get("ORW_REPOSITORY_URL") || null;
  if (!repositoryUrl) {
    console.warn("⚠️  ORW_REPOSITORY_URL not set, GitHub link will be hidden");
  }

  const buildString = Deno.env.get("ORW_BUILD_STRING") || "(unknown)";
  _cachedConfig = {
    publicUrl,
    repositoryUrl,
    buildString,
  };
  _configInitialized = true;

  return _cachedConfig;
}

/**
 * Get application configuration from environment variables
 * Uses cached configuration after first initialization
 */
export function getAppConfig(): AppConfig {
  return initializeAppConfig();
}
