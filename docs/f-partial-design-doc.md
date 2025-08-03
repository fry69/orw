# Design Document: Fresh 2 Partials Optimization (Revised)

## 1. Overview & Analysis

This document outlines a revised strategy to optimize the application's use of Fresh 2 Partials, building on a deeper analysis of the existing codebase.

**Problem:** The application experiences large data transfers (~2MB) on every route change.

**Root Cause Analysis:**
1.  **Global Data Loading:** The `routes/_middleware.ts` file fetches *all* data from the `watcher` (models, changes, removed lists) and places it into `ctx.state.commonData` for every page request.
2.  **State Initialization:** The `islands/DataInitializer.tsx` island is used on every page. It takes the `commonData` from the server and uses it to initialize the client-side state (Preact Signals).
3.  **The Flaw in Partial Navigation:** When a partial navigation is triggered, the `_middleware` runs again, loading all the data. This large `commonData` object is then serialized and passed as a prop to the `DataInitializer` island within the partial response, resulting in the ~2MB payload, even though only a small portion of the UI is being updated.

**Solution:** The core strategy remains the same: use `f-partial` to fetch only the necessary content. However, the implementation must be tailored to the existing state management architecture. The key is to create dedicated partial routes that **do not** run the global middleware and **do not** include the `DataInitializer` island.

## 2. Targeted Routes for Optimization

The primary targets for optimization remain the same:
*   The navigation from list views (like `index.tsx`) to detail views (`model/[id].tsx`).
*   The navigation between the main list pages (`changes.tsx`, `removed.tsx`, etc.).

## 3. Revised Implementation Details

### 3.1. Confirm Existing Setup

The user has correctly pointed out that some of the initial recommendations are already in place:
*   `routes/_app.tsx` already wraps the `<Component />` in a `<Partial name="body">`.
*   `f-client-nav` is already present on the `<body>` tag.

This is a great starting point. The `name="body"` is a bit generic, but it will work. We will use this existing partial.

### 3.2. Step 1: Create a Dedicated Partial Route for Model Details

We will create a new route that fetches *only* the data for a single model and renders *only* the `ModelDetail` component.

**Create New File:** `orw-deno/routes/partials/model/[id].tsx`

```tsx
// orw-deno/routes/partials/model/[id].tsx

import { Handlers, PageProps, RouteConfig } from "fresh";
import { Partial } from "fresh/runtime.ts";
import ModelDetail from "../../../islands/ModelDetail.tsx";
import { getWatcher } from "../../../server/index.ts";
import type { Model } from "../../../lib/types.ts";
import { createHash } from "https://deno.land/std@0.190.0/crypto/mod.ts";

// This config is crucial: it prevents the _app and _middleware from running
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

export const handler: Handlers<Model | null> = {
  async GET(ctx) {
    const watcher = await getWatcher();
    const model = watcher.allLists.models.find(m => m.id === ctx.params.id) ?? null;

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
    return ctx.render(model, { headers });
  },
};

// This component renders ONLY the partial content
export default function ModelDetailPartial({ data }: PageProps<Model | null>) {
  if (!data) {
    return <Partial name="body"><div>Model not found.</div></Partial>;
  }
  return (
    <Partial name="body">
      <ModelDetail model={data} />
    </Partial>
  );
}
```
*Note: This handler now directly calls `getWatcher()` to get only the data it needs, bypassing the global middleware.*

### 3.3. Step 2: Update Links in `ModelList.tsx`

Now, update the links in `islands/ModelList.tsx` to point to this new partial route.

**File:** `orw-deno/islands/ModelList.tsx`

```tsx
// orw-deno/islands/ModelList.tsx
// ... (imports and existing component logic)

// Inside the return statement of the ModelList component:
// ...
  return (
    <div>
      {/* ... */}
      {filteredModels.value.map((model) => (
        <a
          key={model.id}
          href={`/model/${model.id}`}
          f-partial={`/partials/model/${model.id}`} // <-- THE CHANGE
          class="block p-4 border-b hover:bg-gray-100"
        >
          {model.name}
        </a>
      ))}
      {/* ... */}
    </div>
  );
// ...
```

### 4. How This Solves the Problem

1.  **Bypassing the Middleware:** Because the new partial route has `skipAppWrapper: true`, it will not be wrapped by `_app.tsx` and, crucially, will not trigger the global `_middleware.ts`.
2.  **Minimal Data Fetching:** The partial route's handler fetches *only* the data it needs (a single model), not the entire `watcher` state.
3.  **Minimal Payload:** The response from the partial route contains *only* the HTML for the `ModelDetail` component. It does **not** include the `DataInitializer` island or the large `commonData` prop.
4.  **Client State Remains Intact:** The initial client state, which was loaded on the first page visit, remains untouched. The partial navigation simply swaps out the HTML in the `<Partial name="body">` element. The client-side filtering and other signal-based interactions will continue to work on the rest of the page.

### 5. Broader Application

This revised pattern should be applied to other navigation links, especially those in the `NavBar`. For example, the "Changes" link should point to a new partial route `routes/partials/changes.tsx` that renders only the `ChangeList` component.
