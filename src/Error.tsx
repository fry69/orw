import { ReactNode, useEffect, type FC } from "react";

/**
 * Props for the Error component.
 */
export interface ErrorProps {
  /** The error message to display. */
  message: string;
  /** The type of error, either "error" or "info". */
  type?: "error" | "info";
}

/**
 * A React component that displays an error message.
 * If the error type is "error", it adds a "noindex" meta tag to the document's head.
 * @param props - The props for the Error component.
 * @returns The Error component.
 */
const Error: FC<ErrorProps> = ({ message, type = "error" }: ErrorProps): ReactNode => {
  useEffect(() => {
    // Add the "noindex" meta tag to the document's head if it's an error
    if (type === "error") {
      const metaTag = document.createElement("meta");
      metaTag.name = "robots";
      metaTag.content = "noindex";
      document.head.appendChild(metaTag);

      // Clean up the meta tag when the component is unmounted
      return () => {
        document.head.removeChild(metaTag);
      };
    }
  }, [type]);

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        padding: "2rem",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
        backgroundColor: type === "error" ? "#ff4d4f" : "#fff",
        color: type === "error" ? "#fff" : "#333",
        textAlign: "center",
        zIndex: 9999,
      }}
    >
      {message}
    </div>
  );
};

export default Error;
