// components/JsonHighlighter.tsx - A stateless JSON syntax highlighter component.
// This component provides syntax highlighting for JSON objects.
import type { ComponentChild } from "preact";

function highlightJson(json: object): ComponentChild[] {
  const jsonString = JSON.stringify(json, null, 2);
  const lines = jsonString.split("\n");

  return lines.map((line, lineIndex) => {
    const tokens: ComponentChild[] = [];
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
}

export default function JsonHighlighter({ json }: { json: object }) {
  const highlightedContent = highlightJson(json);

  return (
    <pre class="text-xs bg-base-200 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
      <code>{highlightedContent}</code>
    </pre>
  );
}
