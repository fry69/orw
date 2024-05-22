/**
 * Represents an OpenRouter model.
 */
export interface ORModel {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
    request: string;
    image: string;
  };
  context_length: number;
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_type: string | null;
  };
  top_provider: {
    max_completion_tokens: number | null;
    is_moderated: boolean;
  };
  per_request_limits: object | null;
}

export interface Model extends ORModel {
  added_at?: string;
  removed_at?: string;
}

/**
 * Represents the type of change for a model.
 */
export type ModelChangeType = "added" | "removed" | "changed";

/**
 * Represents a change in an OpenRouter model.
 */
export interface ModelDiff {
  id: string;
  type: ModelChangeType;
  model?: Model;
  changes?: { [key: string]: { old: any; new: any } };
  timestamp: string;
}

/**
 * Represents status information in an API response.
 */
export type APIStatus = {
  isValid: boolean;
  isDevelopment: boolean;
  apiLastCheck: string;
  apiLastCheckStatus: string;
  dbLastChange: string;
};

/**
 * Represents a list of model and changes lists.
 */
export type Lists = {
  models: Model[];
  removed: Model[];
  changes: ModelDiff[];
};

/**
 * Represents a generic API response.
 */
export interface APIResponse {
  version: number;
  status?: APIStatus;
  lists?: Lists;
}

/**
 * Represents the private watcher status object
 */
export interface Status {
  /**
   * Timestamp of the last API check
   */
  apiLastCheck: Date;

  /**
   * Status of the last API check
   */
  apiLastCheckStatus: string;

  /**
   * Timestamp of the data in the database
   */
  dbLastChange: Date;
}
