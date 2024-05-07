import styled from "styled-components";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DataTable, { type TableColumn } from "react-data-table-component";
import type { Model } from "../watch-or";
import { DynamicElementContext } from "./App";
import { FilterComponent } from "./FilterComponent";

export const ModelList: React.FC = () => {
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const { setDynamicElement } = useContext(DynamicElementContext);

  const [filterText, setFilterText] = useState("");
  const filteredModels = models.filter(
    (item) =>
      item.name && item.name.toLowerCase().includes(filterText.toLowerCase())
  );

  const filterComponentMemo = useMemo(() => {
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

  useEffect(() => {
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => setModels(data));
  }, []);

  // useEffect(() => {
  setDynamicElement(filterComponentMemo);
  // }, [setDynamicElement]);

  const calcCost = (floatString: string) => {
    const cost = Math.round(parseFloat(floatString) * 1000000 * 100) / 100;
    return cost > 0 ? cost : 0;
  };

  const columns: TableColumn<Model>[] = [
    {
      name: "ID",
      selector: (row) => row.id,
      sortable: true,
      grow: 2,
    },
    {
      name: "Name",
      selector: (row) => row.name,
      sortable: true,
      grow: 2,
    },
    {
      name: "Context",
      selector: (row) => row.context_length,
      sortable: true,
      right: true,

    },
    {
      name: "Price/MT",
      selector: (row) => calcCost(row.pricing.completion),
      sortable: true,
      right: true,
    },
    {
      name: "Token Limit",
      selector: (row) => row.top_provider.max_completion_tokens ?? 0,
      sortable: true,
      right: true,
      sortFunction: (a, b) => {
        if (
          a.top_provider.max_completion_tokens === 0 ||
          !a.top_provider.max_completion_tokens
        ) {
          return 1;
        }
        if (
          b.top_provider.max_completion_tokens === 0 ||
          !b.top_provider.max_completion_tokens
        ) {
          return -1;
        }
        return (
          a.top_provider.max_completion_tokens -
          b.top_provider.max_completion_tokens
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={filteredModels}
      onRowClicked={(row) => navigate(`/model?id=${row.id}`)}
      dense
      highlightOnHover
      defaultSortFieldId={2}
      // subHeader
      // subHeaderComponent={filterComponentMemo}
    />
  );
};
