import { useEffect, useRef } from "react";
import type { ChangeEvent, KeyboardEvent, SetStateAction } from "react";
import styled from "styled-components";
import Button from "./Button";

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

const ClearButton = styled(Button)`
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

interface FilterComponentProps {
  filterText: string;
  onFilter: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onKeydown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export const FilterComponent = ({
  filterText,
  onFilter,
  onClear,
  onKeydown,
}: FilterComponentProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [filterText]);

  const handleClear = () => {
    if (filterText && typeof onClear === "function") {
      onClear();
    }
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
          onChange={onFilter}
          ref={inputRef}
          onKeyDown={(e) => {
            if (typeof onKeydown === "function") {
              onKeydown(e);
            }
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

export const filterComponentWrapper = (
  filterText: string,
  setFilterText: (value: SetStateAction<string>) => void
) => (
  <FilterComponent
    filterText={filterText}
    onFilter={(e: ChangeEvent<HTMLInputElement>) => setFilterText(e.target.value)}
    onClear={() => {
      if (filterText) {
        setFilterText("");
      }
    }}
  />
);
