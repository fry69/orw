import { useEffect, useMemo, useRef } from "react";
import styled from "styled-components";
import Button from "./Button";

const TextField = styled.input`
  height: 32px;
  width: 200px;
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
  onFilter: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  onKeydown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
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
          onKeyDown={onKeydown}
        />
        <ClearButton type="button" onClick={onClear}>
          X
        </ClearButton>
      </span>
    </>
  );
};

export const FilterComponentMemo = (filterText: any, setFilterText: any) =>
  useMemo(() => {
    const handleClear = () => {
      if (filterText) {
        setFilterText("");
      }
    };

    return (
      <FilterComponent
        onFilter={(e: React.ChangeEvent<HTMLInputElement>) =>
          setFilterText(e.target.value)
        }
        onClear={handleClear}
        filterText={filterText}
        onKeydown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Escape") {
            e.currentTarget.blur();
            handleClear();
          }
        }}
      />
    );
  }, [filterText]);
