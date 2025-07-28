// islands/ModelDetail.tsx - Interactive model detail view
import { useEffect, useState } from "preact/hooks";
import { clientLists } from "../lib/state.ts";
import type { Model, ModelDiff } from "../lib/types.ts";

interface ModelDetailProps {
  modelId: string;
}

// Utility functions
const showPricePerMillion = (floatString: string): string => {
  const cost = Math.round(parseFloat(floatString) * 1_000_000 * 100) / 100;
  return cost > 0 ? "$" + cost.toFixed(2) : "[free]";
};

const durationAgo = (timestamp: string): string => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1 month ago";
  if (diffMonths < 12) return `${diffMonths} months ago`;

  const diffYears = Math.floor(diffDays / 365);
  return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
};

const formatDateTime = (timestamp: string): string => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleString();
};

export default function ModelDetail({ modelId }: ModelDetailProps) {
  const lists = clientLists.value;
  const [model, setModel] = useState<Model | null>(null);
  const [changes, setChanges] = useState<ModelDiff[]>([]);
  const [removed, setRemoved] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!modelId) {
      setError("No model ID provided.");
      return;
    }

    // Look for model in active models first
    let foundModel: Model | undefined = lists.models.find(
      (model: Model) => model.id === modelId,
    );

    if (!foundModel) {
      // Look in removed models
      const removedModel: Model | undefined = lists.removed.find(
        (model: Model) => model.id === modelId,
      );
      if (removedModel) {
        setRemoved(true);
        foundModel = removedModel;
      } else {
        setError("Unknown model ID.");
        return;
      }
    }

    setModel(foundModel);
    setError("");

    // Find all changes for this model
    const foundChanges: ModelDiff[] = lists.changes.filter((change) => change.id === modelId);
    setChanges(foundChanges);
  }, [lists, modelId]);

  if (error) {
    return (
      <div class="container mx-auto px-4 py-6">
        <div class="alert alert-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div class="container mx-auto px-4 py-6">
        <div class="flex justify-center">
          <span class="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  const modelDetailsForDisplay = { ...model };
  modelDetailsForDisplay["description"] = "[shown above]";

  return (
    <div class="container mx-auto px-4 py-6">
      {/* Header with model name and ID */}
      <div class="mb-6">
        <h1 class="text-3xl font-bold mb-2">
          {model.name}
          {removed && <span class="ml-3 badge badge-error badge-lg">REMOVED</span>}
        </h1>
        <p class="text-base-content/70 font-mono text-lg">{model.id}</p>
      </div>

      {/* Key metrics cards */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Price Card */}
        <div class="card bg-base-200 shadow-lg">
          <div class="card-body">
            <h2 class="card-title text-info">Price per Million Tokens</h2>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span>Input:</span>
                <span class="badge badge-info">
                  {showPricePerMillion(model.pricing.prompt)}
                </span>
              </div>
              <div class="flex justify-between">
                <span>Output:</span>
                <span class="badge badge-info">
                  {showPricePerMillion(model.pricing.completion)}
                </span>
              </div>
              {model.pricing.request !== "0" && (
                <div class="flex justify-between">
                  <span>Per Request:</span>
                  <span class="badge badge-info">
                    {showPricePerMillion(model.pricing.request)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Context Length Card */}
        <div class="card bg-base-200 shadow-lg">
          <div class="card-body">
            <h2 class="card-title text-warning">Context Length</h2>
            <div class="text-center">
              <div class="text-3xl font-bold text-warning">
                {model.context_length.toLocaleString()}
              </div>
              <div class="text-sm text-base-content/70">tokens</div>
            </div>
          </div>
        </div>

        {/* Model Info Card */}
        <div class="card bg-base-200 shadow-lg">
          <div class="card-body">
            <h2 class="card-title text-success">Model Info</h2>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span>Modality:</span>
                <span class="badge badge-primary badge-sm">
                  {model.architecture.modality}
                </span>
              </div>
              <div class="flex justify-between">
                <span>Tokenizer:</span>
                <span class="badge badge-secondary badge-sm">
                  {model.architecture.tokenizer}
                </span>
              </div>
              {model.architecture.instruct_type && (
                <div class="flex justify-between">
                  <span>Instruct:</span>
                  <span class="badge badge-accent badge-sm">
                    {model.architecture.instruct_type}
                  </span>
                </div>
              )}
              {model.top_provider.max_completion_tokens && (
                <div class="flex justify-between">
                  <span>Max Output:</span>
                  <span class="badge badge-neutral badge-sm">
                    {model.top_provider.max_completion_tokens.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div class="card bg-base-100 shadow-lg mb-8">
        <div class="card-body">
          <h2 class="card-title">Description</h2>
          <pre class="whitespace-pre-wrap text-sm bg-base-200 p-4 rounded-lg overflow-x-auto">
            {model.description || "No description available."}
          </pre>
        </div>
      </div>

      {/* Model Details JSON */}
      <div class="card bg-base-100 shadow-lg mb-8">
        <div class="card-body">
          <h2 class="card-title">Technical Details</h2>
          <pre class="text-xs bg-base-200 p-4 rounded-lg overflow-x-auto">
            {JSON.stringify(modelDetailsForDisplay, null, 2)}
          </pre>
        </div>
      </div>

      {/* Changes History */}
      {changes.length > 0 && (
        <div class="card bg-base-100 shadow-lg">
          <div class="card-body">
            <h2 class="card-title">Change History</h2>
            <div class="space-y-4">
              {changes.map((change, index) => (
                <div key={index} class="border-l-4 border-primary pl-4">
                  <div class="flex items-center gap-2 mb-2">
                    <span
                      class={`badge badge-sm ${
                        change.type === "added"
                          ? "badge-success"
                          : change.type === "removed"
                          ? "badge-error"
                          : "badge-warning"
                      }`}
                    >
                      {change.type}
                    </span>
                    <span class="text-sm text-base-content/70">
                      {durationAgo(change.timestamp)}
                    </span>
                    <span class="text-xs text-base-content/50">
                      ({formatDateTime(change.timestamp)})
                    </span>
                  </div>

                  {change.changes && Object.keys(change.changes).length > 0 && (
                    <div class="text-xs space-y-1">
                      {Object.entries(change.changes).map(([path, changeItem], idx) => (
                        <div key={idx} class="bg-base-200 p-2 rounded">
                          <div class="font-mono font-bold text-primary">{path}:</div>
                          <div class="ml-2">
                            <span class="text-error">- {JSON.stringify(changeItem.old)}</span>
                            <br />
                            <span class="text-success">+ {JSON.stringify(changeItem.new)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Back button */}
      <div class="mt-8 text-center">
        <button
          type="button"
          class="btn btn-primary"
          onClick={() => globalThis.history.back()}
        >
          ← Back to List
        </button>
      </div>
    </div>
  );
}
