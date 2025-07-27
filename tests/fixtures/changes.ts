// test/fixtures/changes.ts - Test fixtures for model changes
import type { Model, ModelDiff } from "../../lib/types.ts";

export const testChanges: ModelDiff[] = [
  {
    id: "lynn/soliloquy-l3",
    type: "changed",
    changes: {
      "pricing.prompt": { old: "0.00000015", new: "0.00000005" },
      "pricing.completion": { old: "0.00000015", new: "0.00000005" },
    },
    timestamp: "2024-05-07T07:29:21.988Z",
  },
  {
    id: "meta-llama/llama-3-8b-instruct:free",
    type: "added",
    model: {
      id: "meta-llama/llama-3-8b-instruct:free",
      name: "Meta: Llama 3 8B Instruct (free)",
      description:
        "Meta's latest class of model (Llama 3) launched with a variety of sizes & flavors.",
      pricing: { prompt: "0", completion: "0", image: "0", request: "0" },
      context_length: 8192,
      architecture: { modality: "text", tokenizer: "Llama3", instruct_type: "llama3" },
      top_provider: { max_completion_tokens: null, is_moderated: false },
      per_request_limits: null,
    } as Model,
    timestamp: "2024-05-07T16:59:40.392Z",
  },
  {
    id: "meta-llama/llama-3-70b-instruct",
    type: "changed",
    changes: {
      "pricing.prompt": { old: "0.00000081", new: "0.00000059" },
      "pricing.completion": { old: "0.00000081", new: "0.00000079" },
    },
    timestamp: "2024-05-08T11:57:03.783Z",
  },
  {
    id: "anthropic/claude-3-opus",
    type: "changed",
    changes: {
      "top_provider.max_completion_tokens": { old: 4096, new: 8192 },
      "context_length": { old: 200000, new: 200000 },
    },
    timestamp: "2024-05-09T14:22:15.123Z",
  },
  {
    id: "openai/gpt-4-turbo",
    type: "removed",
    model: {
      id: "openai/gpt-4-turbo",
      name: "OpenAI: GPT-4 Turbo",
      description: "GPT-4 Turbo with improved performance.",
      pricing: { prompt: "0.001", completion: "0.003", image: "0", request: "0" },
      context_length: 128000,
      architecture: { modality: "text", tokenizer: "cl100k_base", instruct_type: null },
      top_provider: { max_completion_tokens: 4096, is_moderated: true },
      per_request_limits: null,
    } as Model,
    timestamp: "2024-05-09T15:30:45.567Z",
  },
];
