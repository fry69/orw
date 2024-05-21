import { useContext, useEffect, useState, type FC } from "react";
import { filterComponentWrapper } from "./FilterComponent";
import { GlobalContext } from "./GlobalState";
import { Link } from "react-router-dom";
import { ChangeSnippet, dateStringDuration } from "./utils";

export const ChangeList: FC = () => {
  const { globalData, setGlobalClient } = useContext(GlobalContext);

  const [filterText, setFilterText] = useState("");
  const filteredChanges = globalData.changes.filter(
    (item) => item.id && item.id.toLowerCase().includes(filterText.toLowerCase())
  );

  const filterComponent = filterComponentWrapper(filterText, setFilterText);

  useEffect(() => {
    setGlobalClient((prevState) => ({
      ...prevState,
      navBarDynamicElement: filterComponent,
    }));
  }, [filterText]);

  return (
    <div className="change-list">
      {filteredChanges.map((change, index) => (
        <div key={index} className="change-entry">
          <p>
            <Link to={`/model?id=${change.id}`}>
              <b>{change.id}</b>
            </Link>{" "}
            {change.type} at {dateStringDuration(change.timestamp)}
          </p>
          <ChangeSnippet change={change} hideTypes={["removed"]} />
        </div>
      ))}
    </div>
  );
};
