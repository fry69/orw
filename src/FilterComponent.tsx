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

// @ts-ignore
// prettier-ignore
export const FilterComponent = ({ filterText, onFilter, onClear, onKeydown }) => {
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
