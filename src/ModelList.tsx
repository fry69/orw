import { useContext, useEffect, useState, useCallback, type FC, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import DataTable, { type Selector, type TableColumn } from "react-data-table-component";
import type { Model } from "../shared/global";
import { GlobalContext } from "./GlobalState";
import { showPricePerMillion, durationAgo } from "./utils";
import { FilterComponent } from "./FilterComponent";

/**
 * Rounds a number to the nearest kilobyte (kB) if it's greater than or equal to 1024.
 * @param num - The number to round.
 * @returns - The rounded number as a string with 'k' suffix if it's greater than or equal to 1024, otherwise the original number.
 */
const roundKb = (num: number): string => {
  if (num < 1024) {
    return num.toString();
  }
  return `${Math.ceil(num / 1024)}k`;
};

/**
 * Custom sort function for the DataTable component.
 * @param rows - The array of rows to sort.
 * @param selector - The selector function to resolve the field names.
 * @param direction - The sort direction ('asc' or 'desc').
 * @returns - The sorted array of rows.
 */
const customSort = (rows: Model[], selector: Selector<Model>, direction: string): Model[] => {
  return rows.sort((a, b) => {
    let comparison = 0;

    // use the selector to resolve your field names by passing the sort comparators
    const aField = selector(a);
    const bField = selector(b);

    if (typeof aField === "string" && typeof bField === "string") {
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
    } else if (typeof aField === "number" && typeof bField === "number") {
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

/**
 * Defines the columns for the DataTable component.
 */
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
    // name: props.removed ? "Removed" : "Added",
    name: "Added",
    selector: (row) => {
      if (row.removed_at) {
        return row.removed_at;
      } else if (row.added_at) {
        return row.added_at;
      }
      return row.added_at ?? "1970-01-01T00:00:00Z";
    },
    format: (row) => {
      if (row.removed_at) {
        return durationAgo(row.removed_at);
      } else if (row.added_at) {
        return durationAgo(row.added_at);
      }
      return "";
    },
    sortable: true,
    hide: 959,
  },
  {
    name: "Context",
    selector: (row) => row.context_length,
    format: (row) => roundKb(row.context_length),
    sortable: true,
    right: true,
  },
  {
    name: "Price/MT",
    selector: (row) => row.pricing.completion,
    format: (row) => {
      return row.id === "openrouter/auto" ? "[N/A]" : showPricePerMillion(row.pricing.completion);
    },
    sortable: true,
    right: true,
  },
  {
    name: "maxOut",
    selector: (row) => row.top_provider.max_completion_tokens ?? 0,
    format: (row) => {
      const maxOut = row.top_provider.max_completion_tokens ?? 0;
      return maxOut > 0 ? roundKb(maxOut) : "";
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

/**
 * Propertiess for the ModelList component.
 */
export interface ModelListProps {
  /** A flag to indicate whether to display removed models instead. */
  removed?: boolean;
}

/**
 * A functional component that displays a list of models in a DataTable.
 * @param props - The properties passed to the component.
 * @returns - The ReactNode representing the ModelList component.
 */
export const ModelList: FC<ModelListProps> = ({ removed }: ModelListProps): ReactNode => {
  const navigate = useNavigate();
  const { globalLists, globalClient } = useContext(GlobalContext);
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);

  /**
   * A callback function that filters the models based on the provided filter text.
   * @param filterText - The text to filter the models by.
   */
  const filterModels = useCallback(
    (filterText: string) =>
      setFilteredModels(
        removed
          ? globalLists.state.removed.filter(
              (item) => item.id && item.id.toLowerCase().includes(filterText.toLowerCase())
            )
          : globalLists.state.models.filter(
              (item) => item.id && item.id.toLowerCase().includes(filterText.toLowerCase())
            )
      ),
    [removed, globalLists.state.models, globalLists.state.removed]
  );

  /**
   * A useEffect hook that updates the navBarDynamicElement in the globalClient state.
   * It sets the FilterComponent as the dynamic element, passing the filterModels function as a prop.
   */
  useEffect(() => {
    globalClient.setState((prevState) => ({
      ...prevState,
      navBarDynamicElement: <FilterComponent filter={filterModels} />,
    }));
  }, [filterModels]);

  return (
    <>
      {removed && (
        <h2 style={{ textAlign: "center" }}>
          Models no longer available on OpenRouter or renamed:
        </h2>
      )}
      <DataTable
        columns={columns}
        data={filteredModels}
        onRowClicked={(row) => {
          return navigate(`/model?id=${row.id}`);
        }}
        dense
        highlightOnHover
        defaultSortFieldId={3}
        theme="dark"
        sortFunction={customSort}
        defaultSortAsc={false}
        noDataComponent=""
      />
    </>
  );
};
