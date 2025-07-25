// types/client.ts - Client types and interfaces (migrated from lib/client.ts)
import type { ComponentChildren } from "preact";

/**
 * Represents the global client configuration.
 */
export interface GlobalClient {
  /**  The dynamic element to be displayed in the navbar. */
  navBarDynamicElement: ComponentChildren | null;
  /** The durations related to the navbar. */
  navBarDurations: {
    /** The last change timestamp of the database. */
    dbLastChange: string;
    /** The last check timestamp of the API. */
    apiLastCheck: string;
  };
}

/**
 * Represents a global error.
 */
export interface GlobalError {
  /** Indicates whether an error has occurred. */
  isError: boolean;
  /** Indicates whether the error should be prevented from being cleared. */
  preventClearing: boolean;
  /** The error message. */
  message: string;
}
