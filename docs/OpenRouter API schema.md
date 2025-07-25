# OpenRouter API schema

## JSON Schema

This schema defines the structure for the `or-models.json` file, specifying the data types and properties for each field in the model objects.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "OpenRouter Models",
  "description": "A list of AI models available on OpenRouter.",
  "type": "object",
  "properties": {
    "data": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/Model"
      }
    }
  },
  "required": ["data"],
  "definitions": {
    "Model": {
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "description": { "type": "string" },
        "context_length": { "type": "integer" },
        "created": { "type": "integer" },
        "hugging_face_id": { "type": ["string", "null"] },
        "canonical_slug": { "type": "string" },
        "architecture": { "$ref": "#/definitions/Architecture" },
        "pricing": { "$ref": "#/definitions/Pricing" },
        "top_provider": { "$ref": "#/definitions/TopProvider" },
        "per_request_limits": { "type": ["object", "null"] },
        "supported_parameters": {
          "type": "array",
          "items": { "type": "string" }
        }
      },
      "required": [
        "id",
        "name",
        "description",
        "context_length",
        "created",
        "hugging_face_id",
        "canonical_slug",
        "architecture",
        "pricing",
        "top_provider",
        "per_request_limits",
        "supported_parameters"
      ]
    },
    "Architecture": {
      "type": "object",
      "properties": {
        "modality": { "type": "string" },
        "input_modalities": {
          "type": "array",
          "items": { "type": "string" }
        },
        "output_modalities": {
          "type": "array",
          "items": { "type": "string" }
        },
        "tokenizer": { "type": "string" },
        "instruct_type": { "type": ["string", "null"] }
      },
      "required": [
        "modality",
        "input_modalities",
        "output_modalities",
        "tokenizer",
        "instruct_type"
      ]
    },
    "Pricing": {
      "type": "object",
      "properties": {
        "prompt": { "type": "string" },
        "completion": { "type": "string" },
        "request": { "type": "string" },
        "image": { "type": "string" },
        "web_search": { "type": "string" },
        "internal_reasoning": { "type": "string" },
        "input_cache_read": { "type": "string" },
        "input_cache_write": { "type": "string" }
      },
      "required": [
        "prompt",
        "completion",
        "request",
        "image",
        "web_search",
        "internal_reasoning"
      ]
    },
    "TopProvider": {
      "type": "object",
      "properties": {
        "context_length": { "type": "integer" },
        "max_completion_tokens": { "type": ["integer", "null"] },
        "is_moderated": { "type": "boolean" }
      },
      "required": ["context_length", "max_completion_tokens", "is_moderated"]
    }
  }
}
```

-----

## TypeScript Interfaces

These TypeScript interfaces provide static type checking for the model data, which is useful for development in a TypeScript environment.

```typescript
export interface OpenRouterModels {
  data: Model[];
}

export interface Model {
  id: string;
  name: string;
  description: string;
  context_length: number;
  created: number;
  hugging_face_id: string | null;
  canonical_slug: string;
  architecture: Architecture;
  pricing: Pricing;
  top_provider: TopProvider;
  per_request_limits: Record<string, unknown> | null;
  supported_parameters: string[];
}

export interface Architecture {
  modality: string;
  input_modalities: string[];
  output_modalities: string[];
  tokenizer: string;
  instruct_type: string | null;
}

export interface Pricing {
  prompt: string;
  completion: string;
  request: string;
  image: string;
  web_search: string;
  internal_reasoning: string;
  input_cache_read?: string;
  input_cache_write?: string;
}

export interface TopProvider {
  context_length: number;
  max_completion_tokens: number | null;
  is_moderated: boolean;
}
```

-----

## Zod Types

These Zod schemas are perfect for runtime validation, ensuring that the data fetched from an API or read from the file conforms to the expected structure and types.

```typescript
import { z } from 'zod';

const ArchitectureSchema = z.object({
  modality: z.string(),
  input_modalities: z.array(z.string()),
  output_modalities: z.array(z.string()),
  tokenizer: z.string(),
  instruct_type: z.string().nullable(),
});

const PricingSchema = z.object({
  prompt: z.string(),
  completion: z.string(),
  request: z.string(),
  image: z.string(),
  web_search: z.string(),
  internal_reasoning: z.string(),
  input_cache_read: z.string().optional(),
  input_cache_write: z.string().optional(),
});

const TopProviderSchema = z.object({
  context_length: z.number().int(),
  max_completion_tokens: z.number().int().nullable(),
  is_moderated: z.boolean(),
});

const ModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  context_length: z.number().int(),
  created: z.number().int(),
  hugging_face_id: z.string().nullable(),
  canonical_slug: z.string(),
  architecture: ArchitectureSchema,
  pricing: PricingSchema,
  top_provider: TopProviderSchema,
  per_request_limits: z.record(z.unknown()).nullable(),
  supported_parameters: z.array(z.string()),
});

const OpenRouterModelsSchema = z.object({
  data: z.array(ModelSchema),
});

// You can infer the TypeScript types directly from the Zod schemas
type Model = z.infer<typeof ModelSchema>;
type OpenRouterModels = z.infer<typeof OpenRouterModelsSchema>;
```

---

Here is a comprehensive list of all unique, known values for the variable fields in the current model list.

### Architecture Fields

This section details the unique values found within the `architecture` object for all models.

* **`modality`**:
    * `text->text`
    * `text+image->text`

* **`input_modalities`**:
    * `file`
    * `image`
    * `text`

* **`output_modalities`**:
    * `text`

* **`tokenizer`**:
    * `Claude`
    * `DeepSeek`
    * `GPT`
    * `Gemini`
    * `Grok`
    * `Llama2`
    * `Llama3`
    * `Llama4`
    * `Mistral`
    * `Nova`
    * `Other`
    * `Qwen`
    * `Qwen3`
    * `Router`
    * `Yi`

* **`instruct_type`**:
    * `airoboros`
    * `alpaca`
    * `chatml`
    * `code-llama`
    * `deepseek-r1`
    * `gemma`
    * `llama3`
    * `mistral`
    * `none`
    * `phi3`
    * `qwen3`
    * `qwq`
    * `vicuna`
    * `null`

---

### Supported Parameters

This is a complete list of all unique values found in the `supported_parameters` array across all models.

* `frequency_penalty`
* `include_reasoning`
* `logit_bias`
* `logprobs`
* `max_tokens`
* `min_p`
* `presence_penalty`
* `reasoning`
* `repetition_penalty`
* `response_format`
* `seed`
* `stop`
* `structured_outputs`
* `temperature`
* `tool_choice`
* `tools`
* `top_a`
* `top_k`
* `top_logprobs`
* `top_p`
* `web_search_options`
