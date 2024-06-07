import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FC, ReactNode } from "react";
import styled from "styled-components";

/**
 * Styled input component for text filtering
 */
const TextField = styled.input`
  height: 32px;
  width: 130px;
  border-radius: 3px;
  border-top-left-radius: 5px;
  border-bottom-left-radius: 5px;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border: 1px solid #e5e5e5;
  padding: 0 32px 0 16px;

  &:hover {
    cursor: pointer;
  }
`;

/**
 * Styled button component for clearing the filter
 */
const ClearButton = styled.button`
  background-color: #2979ff;
  border: none;
  color: white;
  padding: 8px 32px 8px 32px;
  text-decoration: none;
  font-size: 16px;

  &:hover {
    cursor: pointer;
  }

  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-top-right-radius: 5px;
  border-bottom-right-radius: 5px;
  height: 34px;
  width: 32px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
`;

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

  return (
    <>
      <span style={{ display: "flex" }}>
        <TextField
          id="search"
          type="text"
          placeholder="Filter By Name"
          aria-label="Search Input"
          value={filterText}
          onChange={handleChange}
          ref={inputRef}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.currentTarget.blur();
              handleClear();
            }
          }}
        />
        <ClearButton type="button" onClick={handleClear}>
          X
        </ClearButton>
      </span>
    </>
  );
};
