import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChangeSnippet } from "../client/ChangeSnippet";
import type { ModelDiff } from "../global";

const change: ModelDiff = {
  id: "my/model",
  type: "changed",
  timestamp: "",
  changes: {
    "pricing.completion": {
      old: "0.01",
      new: "0.02",
    },
    top_provider: {
      old: true,
      new: false,
    },
  },
};

const componentHTML = renderToStaticMarkup(
  React.createElement(ChangeSnippet, { change, hideTypes: [] })
);
console.log(componentHTML);
