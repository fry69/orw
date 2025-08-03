# Design Document: Fresh 2 Partials Optimization

## 1. Overview

**Problem:** The application currently experiences large data transfers (~2MB) on every route change. This is caused by the default Fresh Partials behavior, which fetches and renders the entire page for each navigation, sending the full state object (including large JSON lists from the watcher) on every click.

**Solution:** This document outlines a strategy to drastically reduce network payloads and improve perceived performance by adopting an optimized partial rendering approach. The solution involves two key Fresh 2 features:

*   **`f-partial` Attribute:** To fetch only the specific content needed for a UI update, rather than the entire page.
*   **ETag-based Caching:** To eliminate redundant data transfers by allowing the browser to reuse cached content when it has not changed.

This approach avoids the need for a separate, manually-managed API, aligning with the core philosophy of Fresh.

## 2. Targeted Routes for Optimization

Based on the project structure, the primary candidate for this optimization is the navigation flow from list views to detail views. The most impactful area to start with is the **Model View**:

*   **List View:** `routes/index.tsx` (and potentially `routes/list.tsx`), which uses the `islands/ModelList.tsx` component.
*   **Detail View:** `routes/model/[id].tsx`, which uses the `islands/ModelDetail.tsx` component.

The goal is to update the main content area of the page when a user clicks on a model in the list, without reloading the navbar and other static elements.

This same pattern will then be applied to other key routes, such as:
*   `routes/changes.tsx`
*   `routes/removed.tsx`

## 3. Implementation Details

The implementation will be focused on the Model View workflow.

### 3.1. Step 1: Create the Main Content Partial Wrapper

First, we need to designate the main content area of the application as a `Partial`. This is done in `routes/_app.tsx`.

**File:** `routes/_app.tsx`

```tsx
// routes/_app.tsx
import { PageProps } from "fresh";
import { Partial } from "fresh/runtime.ts";
import NavBar from "../islands/NavBar.tsx";

export default function App({ Component }: PageProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-g" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ORW Deno</title>
        <link rel="stylesheet" href="/app.css" />
      </head>
      <body f-client-nav>
        <NavBar />
        {/* Wrap the main component in a Partial named "main-content" */}
        <Partial name="main-content">
          <Component />
        </Partial>
      </body>
    </html>
  );
}
```

### 3.2. Step 2: Create the Dedicated Partial Route

Next, we will create a new route that will be responsible *only* for rendering the content of the model detail page.

**Create New File:** `routes/partials/model-detail/[id].tsx`

```tsx
// routes/partials/model-detail/[id].tsx

import { Handlers, PageProps, RouteConfig } from "fresh";
import { Partial } from "fresh/runtime.ts";
import ModelDetail from "../../../islands/ModelDetail.tsx";
import { getModel, Model } from "../../../lib/state.ts"; // Assuming data fetching logic exists
import { createHash } from "https://deno.land/std@0.190.0/crypto/mod.ts";

export const config: RouteConfig = {
  skipAppWrapper: true,
  skipInheritedLayouts: true,
};

async function generateEtag(data: Model): Promise<string> {
  const dataString = JSON.stringify(data);
  const hash = createHash("sha-1");
  hash.update(dataString);
  return hash.toString();
}

export const handler: Handlers<Model> = {
  async GET(ctx) {
    const model = await getModel(ctx.params.id); // Fetch the specific model data
    if (!model) {
      return new Response("Model not found", { status: 404 });
    }

    const etag = await generateEtag(model);

    const ifNoneMatch = ctx.req.headers.get("if-none-match");
    if (ifNoneMatch === etag) {
      return new Response(null, { status: 304 });
    }

    const headers = new Headers();
    headers.set("ETag", etag);
    // Pass the fetched model data to the component
    return ctx.render(model, { headers });
  },
};

// This component now receives the model data directly from the handler
export default function ModelDetailPartial({ data }: PageProps<Model>) {
  return (
    <Partial name="main-content">
      <ModelDetail model={data} />
    </Partial>
  );
}
```

### 3.3. Step 3: Update Links to Use `f-partial`

Now, we need to update the links in the `ModelList.tsx` island to use the `f-partial` attribute, pointing to our new dedicated partial route.

**File:** `islands/ModelList.tsx`

```tsx
// islands/ModelList.tsx
// ... imports

export default function ModelList({ models }: { models: Model[] }) {
  // ... component logic

  return (
    <div>
      {models.map((model) => (
        <a
          key={model.id}
          href={`/model/${model.id}`}
          f-partial={`/partials/model-detail/${model.id}`} // <-- THE CHANGE
          class="block p-4 border-b hover:bg-gray-100"
        >
          {model.name}
        </a>
      ))}
    </div>
  );
}
```

### 4. Broader Application

The same three-step pattern can be applied to other parts of the application:

*   **Changes View (`routes/changes.tsx`):**
    1.  Ensure the main content area in `_app.tsx` is wrapped in `<Partial name="main-content">`. (Done in step 3.1)
    2.  Create a new partial route: `routes/partials/changes-list.tsx`.
    3.  This route will fetch the change data and render the `islands/ChangeList.tsx` component inside a `<Partial name="main-content">`.
    4.  Update the link to the "Changes" page in `islands/NavBar.tsx` to use `f-partial="/partials/changes-list"`.

*   **Removed View (`routes/removed.tsx`):**
    1.  Follow the same pattern as the Changes View, creating a `routes/partials/removed-list.tsx` and updating the corresponding link in the `NavBar`.

By systematically applying this approach, the application's network efficiency will be dramatically improved, leading to a faster, more responsive user experience.
