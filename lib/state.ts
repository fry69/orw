// lib/state.ts - Fresh 2 global state management using signals
import { computed, signal } from "@preact/signals";
import type { APIStatus, Lists } from "../shared/global.ts";
import type { GlobalClient, GlobalError } from "./client.ts";
import { durationAgo } from "./utils.ts";

/**
 * Default values for global state
 */
const defaultStatus: APIStatus = {
  isValid: false,
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

const defaultClient: GlobalClient = {
  navBarDynamicElement: null,
  navBarDurations: {
    dbLastChange: "",
    apiLastCheck: "",
  },
};

const defaultError: GlobalError = {
  isError: false,
  preventClearing: false,
  message: "",
};

/**
 * Global signals for state management
 */
export const globalStatus = signal<APIStatus>(defaultStatus);
export const globalLists = signal<Lists>(defaultLists);
export const globalClient = signal<GlobalClient>(defaultClient);
export const globalError = signal<GlobalError>(defaultError);

/**
 * Computed values for derived state
 */
export const navBarDurations = computed(() => ({
  dbLastChange: durationAgo(globalStatus.value.dbLastChange),
  apiLastCheck: globalStatus.value.isDevelopment
    ? "[dev mode]"
    : durationAgo(globalStatus.value.apiLastCheck, true),
}));

/**
 * Computed value for filtered models (to be used in ModelList island)
 */
export const filteredModels = computed(() => {
  // This will be implemented in the ModelList island
  return globalLists.value.models;
});

/**
 * Helper function to set global error state
 */
export function setGlobalError(message?: string, preventClearing: boolean = false) {
  if (message) {
    console.error(message);
    globalError.value = { isError: true, message, preventClearing };
  } else {
    globalError.value = { isError: false, message: "", preventClearing: false };
  }
}

/**
 * Initialize state with server-side data
 */
export function initializeState(initialData: { status?: APIStatus; lists?: Lists }) {
  if (initialData.status) {
    globalStatus.value = initialData.status;
  }
  if (initialData.lists) {
    globalLists.value = initialData.lists;
  }
}
