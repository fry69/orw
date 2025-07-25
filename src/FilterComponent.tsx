import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FC, ReactNode } from "react";

/**
 * Props for the FilterComponent.
 */
export interface FilterComponentProps {
  /** Function to filter data based on the filter text. */
  filter: (filterText: string) => void;
}

/**
 * Component for filtering data based on a text input
 * @param props - Props for the FilterComponent
 * @returns - The FilterComponent
 */
export const FilterComponent: FC<FilterComponentProps> = ({
  filter,
}: FilterComponentProps): ReactNode => {
  const [filterText, setFilterText] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    filter(filterText);
  }, [filter, filterText]);

  /**
   * Handles clearing the filter text
   */
  const handleClear = () => {
    setFilterText("");
    filter("");
  };

  /**
   * Handles changing the filter text
   * @param event - The change event
   */
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const filterText = event.target.value;
    setFilterText(filterText);
  };

  const inputStyle: React.CSSProperties = {
    height: "32px",
    width: "130px",
    borderRadius: "3px",
    borderTopLeftRadius: "5px",
    borderBottomLeftRadius: "5px",
    borderTopRightRadius: "0",
    borderBottomRightRadius: "0",
    border: "1px solid #666",
    padding: "0 32px 0 16px",
    backgroundColor: "#2a2a2a",
    color: "white",
    fontSize: "14px",
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: "#2979ff",
    border: "none",
    color: "white",
    padding: "8px 32px 8px 32px",
    textDecoration: "none",
    fontSize: "16px",
    borderTopLeftRadius: "0",
    borderBottomLeftRadius: "0",
    borderTopRightRadius: "5px",
    borderBottomRightRadius: "5px",
    height: "34px",
    width: "32px",
    textAlign: "center" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  };

  return (
    <>
      <span style={{ display: "flex" }}>
        <input
          id="search"
          type="text"
          placeholder="Filter By Name"
          aria-label="Search Input"
          value={filterText}
          onChange={handleChange}
          ref={inputRef}
          style={inputStyle}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.currentTarget.blur();
              handleClear();
            }
          }}
          onFocus={(e) => e.target.style.borderColor = "#0066cc"}
          onBlur={(e) => e.target.style.borderColor = "#666"}
        />
        <button
          type="button"
          onClick={handleClear}
          style={buttonStyle}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#1976d2"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#2979ff"}
        >
          X
        </button>
      </span>
    </>
  );
};
