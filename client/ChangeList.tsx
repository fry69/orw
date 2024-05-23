import { useContext, useEffect, useState, type FC } from "react";
import { filterComponentWrapper } from "./utils";
import { GlobalContext } from "./GlobalState";
import { Link } from "react-router-dom";
import { dateStringDuration } from "./utils";
import { ChangeSnippet } from "./ChangeSnippet";

export const ChangeList: FC = () => {
  const { globalLists, setGlobalClient } = useContext(GlobalContext);

  const [filterText, setFilterText] = useState("");
  const filteredChanges = globalLists.changes.filter(
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
