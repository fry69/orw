// components/ErrorContainer.tsx - Error display component
import type { ComponentChildren } from "preact";
import { globalError } from "../lib/state.ts";

interface ErrorContainerProps {
  children: ComponentChildren;
}

export default function ErrorContainer({ children }: ErrorContainerProps) {
  const error = globalError.value;

  if (error.isError) {
    return (
      <div class="error-container">
        <div class="error-message">
          <h2>Error</h2>
          <p>{error.message}</p>
          {!error.preventClearing && (
            <button
              type="button"
              onClick={() =>
                globalError.value = { isError: false, message: "", preventClearing: false }}
              class="error-dismiss"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
