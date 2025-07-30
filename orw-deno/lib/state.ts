// lib/state.ts - Fresh 2 client state management using signals
import { computed, signal } from "@preact/signals";
import type { AppConfig, Lists, WatcherStatus } from "./types.ts";
import { durationAgo } from "./utils.ts";

/**
 * Default values for client state
 */
const defaultConfig: AppConfig = {
  publicUrl: "http://localhost:8000",
  repositoryUrl: null,
};

const defaultStatus: WatcherStatus = {
  isDevelopment: false,
  apiLastCheck: "",
  apiLastCheckStatus: "",
  dbLastChange: "",
};

const defaultLists: Lists = {
  models: [],
  removed: [],
  changes: [],
};

/**
 * Client signals for state management
 */
export const clientConfig = signal<AppConfig>(defaultConfig);
export const clientStatus = signal<WatcherStatus>(defaultStatus);
export const clientLists = signal<Lists>(defaultLists);

/**
 * Computed values for derived state
 */
export const navBarDurations = computed(() => ({
  dbLastChange: durationAgo(clientStatus.value.dbLastChange),
  apiLastCheck: clientStatus.value.isDevelopment
    ? "[dev mode]"
    : durationAgo(clientStatus.value.apiLastCheck, true),
}));

/**
 * Computed value for filtered models (to be used in ModelList island)
 */
export const filteredModels = computed(() => {
  // This will be implemented in the ModelList island
  return clientLists.value.models;
});
