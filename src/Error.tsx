import React from "react";

interface ErrorProps {
  message: string;
  type?: "error" | "info";
}

const Error: React.FC<ErrorProps> = ({ message, type = "error" }) => {
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
