import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DataTable, { type TableColumn } from "react-data-table-component";
import type { Model } from "../global";
import { GlobalContext } from "./GlobalState";
import { calcCost, durationAgo } from "./utils";
import { filterComponentWrapper } from "./FilterComponent";

export const ModelList: React.FC<{ removed?: boolean }> = (props) => {
  const navigate = useNavigate();
  const [models, setModels] = useState<Model[]>([]);
  const { globalState, setGlobalState } = useContext(GlobalContext);

  const [filterText, setFilterText] = useState("");
  const filteredModels = models.filter(
    (item) =>
      item.name && item.name.toLowerCase().includes(filterText.toLowerCase())
  );

  const filterComponent = filterComponentWrapper(filterText, setFilterText);

  useEffect(() => {
    let endpoint: string;
    if (props.removed) {
      endpoint = "/api/removed";
    } else {
      endpoint = "/api/models";
    }
    fetch(endpoint)
      .then((res) => res.json())
      .then((data) => {
        setModels(data.data);
        setGlobalState((prevState) => ({
          ...prevState,
          status: data.status,
        }));
      });
  }, [props, globalState.refreshTrigger]);

  useEffect(() => {
    setGlobalState((prevState) => ({
      ...prevState,
      navBarDynamicElement: filterComponent,
    }));
  }, [filterText]);

  const roundContext = (context: number) => {
    return `${Math.ceil(context / 1024)}k`;
  };

  const customSort = (rows: Model[], selector: any, direction: string) => {
    return rows.sort((a, b) => {
      let comparison = 0;

      // use the selector to resolve your field names by passing the sort comparators
      const aField = selector(a);
      const bField = selector(b);

      if (typeof aField === "string" || typeof bField === "string") {
        // String comparison
        // empty string should stay at bottom to not clutter reverse sort (e.g. Instruct)
        if (aField === "" && bField === "") {
          return 0;
        } else if (aField === "" || !aField) {
          return 1;
        } else if (bField === "" || !bField) {
          return -1;
        } else if (aField.toLowerCase() > bField.toLowerCase()) {
          comparison = 1;
        } else if (aField.toLowerCase() < bField.toLowerCase()) {
          comparison = -1;
        }
      } else if (typeof aField === "number" || typeof bField === "number") {
        // Number comparison
        // 0 should stay at bottom to not clutter reverse sort (e.g. maxOut)
        // pricing gets sorted via string sort and obeys 0 at top
        if (aField === 0 && bField === 0) {
          return 0;
        } else if (aField === 0 || !aField) {
          return 1;
        } else if (bField === 0 || !bField) {
          return -1;
        } else {
          comparison = aField - bField;
        }
      }

      return direction === "desc" ? comparison * -1 : comparison;
    });
  };

  const columns: TableColumn<Model>[] = [
    {
      name: "ID",
      selector: (row) => row.id,
      sortable: true,
      grow: 3,
    },
    {
      name: "Name",
      selector: (row) => row.name,
      sortable: true,
      grow: 3,
    },
    {
      name: "Added",
      selector: (row) => row.added_at ?? "1970-01-01T00:00:00Z",
      format: (row) => (row.added_at ? durationAgo(row.added_at) : ""),
      sortable: true,
      hide: 959,
    },
    {
      name: "Context",
      selector: (row) => row.context_length,
      format: (row) => roundContext(row.context_length),
      sortable: true,
      right: true,
    },
    {
      name: "Price/MT",
      selector: (row) => row.pricing.completion,
      format: (row) => {
        return row.id === "openrouter/auto"
          ? "[N/A]"
          : calcCost(row.pricing.completion);
      },
      sortable: true,
      right: true,
    },
    {
      name: "maxOut",
      selector: (row) => row.top_provider.max_completion_tokens ?? 0,
      format: (row) => {
        const maxOut = row.top_provider.max_completion_tokens ?? 0;
        return maxOut > 0 ? maxOut : "";
      },
      sortable: true,
      hide: 599,
      right: true,
    },
    {
      name: "Modality",
      selector: (row) => row.architecture.modality,
      sortable: true,
      hide: 959,
    },
    {
      name: "Tokenizer",
      selector: (row) => row.architecture.tokenizer,
      sortable: true,
      hide: 959,
    },
    {
      name: "Instruct",
      selector: (row) => row.architecture.instruct_type ?? "",
      sortable: true,
      hide: 959,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={filteredModels}
      onRowClicked={(row) => {
        if (!props.removed) {
          return navigate(`/model?id=${row.id}`);
        }
      }}
      dense
      highlightOnHover
      defaultSortFieldId={3}
      theme="dark"
      sortFunction={customSort}
      defaultSortAsc={false}
    />
  );
};
