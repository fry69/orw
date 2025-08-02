// islands/ModelDetail.tsx - Interactive model detail view
import { useEffect, useState } from "preact/hooks";
import { clientLists } from "../lib/state.ts";
import type { Model, ModelDiff } from "../lib/types.ts";
import {
  durationAgo,
  formatDateTime,
  showPricePerMillion,
} from "../lib/utils.ts";
import { ChangeView } from "../components/ChangeView.tsx";

interface ModelDetailProps {
  modelId: string;
}

// JSON Syntax Highlighter Component with manual highlighting
function JsonHighlighter({ json }: { json: object }) {
  const [highlightedContent, setHighlightedContent] = useState<preact.ComponentChild[]>([]);

  useEffect(() => {
    const jsonString = JSON.stringify(json, null, 2);
    const lines = jsonString.split("\n");

    const highlighted = lines.map((line, lineIndex) => {
      const tokens: preact.ComponentChild[] = [];
      let i = 0;

      while (i < line.length) {
        const char = line[i];

        // Skip whitespace
        if (/\s/.test(char)) {
          tokens.push(<span key={`${lineIndex}-${i}`}>{char}</span>);
          i++;
          continue;
        }

        // String values
        if (char === '"') {
          let endIndex = i + 1;
          while (endIndex < line.length && line[endIndex] !== '"') {
            if (line[endIndex] === "\\") endIndex++; // Skip escaped characters
            endIndex++;
          }
          if (endIndex < line.length) endIndex++; // Include closing quote

          const stringValue = line.substring(i, endIndex);
          const isProperty = line[endIndex] === ":";

          tokens.push(
            <span
              key={`${lineIndex}-${i}`}
              style={{
                color: isProperty ? "var(--color-primary)" : "var(--color-info)",
                fontWeight: isProperty ? "700" : "500",
              }}
            >
              {stringValue}
            </span>,
          );
          i = endIndex;
          continue;
        }

        // Keywords (true, false, null)
        if (/[a-z]/.test(char)) {
          let endIndex = i;
          while (endIndex < line.length && /[a-z]/.test(line[endIndex])) {
            endIndex++;
          }

          const word = line.substring(i, endIndex);
          if (["true", "false", "null"].includes(word)) {
            tokens.push(
              <span
                key={`${lineIndex}-${i}`}
                style={{ color: "var(--color-warning)", fontWeight: "700" }}
              >
                {word}
              </span>,
            );
          } else {
            tokens.push(<span key={`${lineIndex}-${i}`}>{word}</span>);
          }
          i = endIndex;
          continue;
        }

        // Numbers
        if (/[0-9.-]/.test(char)) {
          let endIndex = i;
          while (endIndex < line.length && /[0-9.-]/.test(line[endIndex])) {
            endIndex++;
          }

          const number = line.substring(i, endIndex);
          tokens.push(
            <span
              key={`${lineIndex}-${i}`}
              style={{ color: "var(--color-info)", fontWeight: "600" }}
            >
              {number}
            </span>,
          );
          i = endIndex;
          continue;
        }

        // Punctuation
        if (["{", "}", "[", "]", ":", ","].includes(char)) {
          tokens.push(
            <span
              key={`${lineIndex}-${i}`}
              style={{ color: "var(--color-accent)", fontWeight: "600" }}
            >
              {char}
            </span>,
          );
          i++;
          continue;
        }

        // Default
        tokens.push(<span key={`${lineIndex}-${i}`}>{char}</span>);
        i++;
      }

      return <div key={lineIndex}>{tokens}</div>;
    });

    setHighlightedContent(highlighted);
  }, [json]);

  return (
    <pre class="text-xs bg-base-200 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
      <code>{highlightedContent}</code>
    </pre>
  );
}

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

    let foundModel: Model | undefined = lists.models.find(
      (model: Model) => model.id === modelId,
    );

    if (!foundModel) {
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

    const foundChanges: ModelDiff[] = lists.changes.filter((change: ModelDiff) =>
      change.id === modelId
    );
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
            {model.description || ""}
          </pre>
        </div>
      </div>

      {/* Model Details JSON */}
      <div class="card bg-base-100 shadow-lg mb-8">
        <div class="card-body">
          <h2 class="card-title">Technical Details</h2>
          <JsonHighlighter json={modelDetailsForDisplay} />
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
                  <ChangeView change={change} />
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
