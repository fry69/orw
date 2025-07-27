/**
 * Represents an OpenRouter model.
 */
export interface ORModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  created?: number;
  hugging_face_id?: string | null;
  canonical_slug?: string;
  pricing: {
    prompt: string;
    completion: string;
    request: string;
    image: string;
    web_search?: string;
    internal_reasoning?: string;
    input_cache_read?: string;
    input_cache_write?: string;
  };
  architecture: {
    modality: string;
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer: string;
    instruct_type: string | null;
  };
  top_provider: {
    context_length?: number;
    max_completion_tokens: number | null;
    is_moderated: boolean;
  };
  per_request_limits: object | null;
  supported_parameters?: string[];
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
  changes?: { [key: string]: { old: unknown; new: unknown } };
  timestamp: string;
}

/**
 * Represents status information in an API response.
 */
export type WatcherStatus = {
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
