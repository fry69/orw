// types/client.ts - Client types and interfaces (migrated from lib/client.ts)

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
