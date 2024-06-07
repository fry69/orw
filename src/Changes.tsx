import { FC, ReactNode } from "react";
import type { ModelDiff } from "../shared/global";
import { dateStringDuration } from "./utils";
import { ChangeSnippet } from "./ChangeSnippet";

/**
 * Props for the Changes component.
 */
export interface ChangesProps {
  /** The changes made to the model. */
  changes: ModelDiff[];
}

/**
 * Changes component displays the changes made to the model.
 * If there are no changes, it returns an empty component.
 * @param props - The props for the changes component.
 * @returns The changes component.
 */
export const Changes: FC<ChangesProps> = ({ changes }: ChangesProps): ReactNode => {
  if (changes.length > 0) {
    return (
      <>
        <h3>Changes</h3>
        {changes.map((change, index) => (
          <div key={index} className="change-entry">
            <p>
              {change.type} at {dateStringDuration(change.timestamp)}
            </p>
            <ChangeSnippet change={change} hideTypes={["added", "removed"]} />
          </div>
        ))}
      </>
    );
  } else {
    return <></>;
  }
};
