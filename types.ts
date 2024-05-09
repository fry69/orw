/**
 * Represents an OpenRouter model.
 */
export interface Model {
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
  timestamp: Date;
}

export interface APIResponse<T> {
  apiLastCheck: Date;
  dbLastChange: Date;
  data: T;
}

export type ModelsResponse = APIResponse<Model[]>;

export type ModelResponse = APIResponse<{
  model: Model;
  changes: ModelDiff[];
}>;

export type ChangesResponse = APIResponse<{
  changes: ModelDiff[];
}>;
