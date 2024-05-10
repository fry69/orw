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

/**
 * Represents the status information in an API response.
 */
type ResponseStatusSig = {
  apiLastCheck: Date;
  dbLastChange: Date;
  dbModelCount: number;
  dbChangesCount: number;
};

/**
 * Represents the structure of the data object in an API response.
 */
export type ResponseDataSig =
  | Model[]
  | {
      changes: ModelDiff[];
      model?: Model;
    };

/**
 * Represents a generic API response.
 * @template T - The type of data in the response, must conform to ResponseDataSig.
 */
export interface APIResponse<T extends ResponseDataSig> {
  status: ResponseStatusSig;
  data: T;
}

/**
 * Represents a response containing a list of models.
 */
export type ModelsResponse = APIResponse<Model[]>;

/**
 * Represents a response containing a model and its changes.
 */
export type ModelResponse = APIResponse<ResponseDataSig>;

/**
 * Represents a response containing a list of changes.
 */
export type ChangesResponse = APIResponse<ResponseDataSig>;

/**
 * Represents the private status object
 */
export interface Status {
  /**
   * Timestamp of the last API check
   */
  apiLastCheck: Date;

  /**
   * Timestamp of the data in the database
   */
  dbLastChange: Date;

  /**
   * Number of changes in database
   */
  dbChangesCount: number;
}
