# Design Document: Fresh 2 Partials Optimization (Revised)

## 1. Overview & Analysis

This document outlines a revised strategy to optimize the application's use of Fresh 2 Partials, building on a deeper analysis of the existing codebase.

**Problem:** The application experiences large data transfers (~2MB) on every route change.

**Root Cause Analysis:**
1.  **Global Data Loading:** The `routes/_middleware.ts` file fetches *all* data from the `watcher` and places it into `ctx.state.commonData` for every page request.
2.  **State Initialization:** The `islands/DataInitializer.tsx` island is used on every page, serializing the large `commonData` object into the initial HTML.
3.  **The Flaw in Partial Navigation:** When a partial navigation is triggered, the `_middleware` runs again, causing the entire `commonData` object to be fetched and serialized into the partial response, even though only a small piece of the UI is changing.

**Solution:** The core strategy is to use `f-partial` to fetch only the necessary content. The key is to create dedicated partial routes that **do not** run the global middleware and **do not** include the `DataInitializer` island.

## 2. The Hybrid Architecture: Middleware vs. Partials

This optimization does **not** mean getting rid of the `_middleware.ts`. Instead, it creates a hybrid architecture that uses the best tool for each job:

*   **`_middleware.ts` (For Initial Load):**
    *   **Role:** To handle the first time a user visits the site (a full page load).
    *   **Function:** It efficiently loads *all* the data needed for the application to be fully interactive from the moment it loads. The `DataInitializer` then populates the client-side signals.
    *   **Benefit:** This provides a rich, fast initial experience, which is a core strength of the current architecture.

*   **Partial Routes (For Subsequent Navigation):**
    *   **Role:** To handle all client-side navigations after the initial load.
    *   **Function:** These routes bypass the global middleware (`skipAppWrapper: true`). They fetch only the minimal data required for the specific component they render.
    *   **Benefit:** This results in extremely small payloads for navigation, making the app feel instantaneous.

## 3. Implementation Plan

### 3.1. High-Level Strategy

1.  Keep the existing `_middleware.ts` and `DataInitializer.tsx` as they are. They work perfectly for the initial page load.
2.  For each main page component (e.g., `ModelDetail`, `ChangeList`), create a corresponding partial route in `routes/partials/`.
3.  These partial routes will have `skipAppWrapper: true` in their config.
4.  Their handlers will fetch only the data they need and implement ETag caching.
5.  Update all navigation links (`<a>` tags) to use the `f-partial` attribute, pointing to these new partial routes.

### 3.2. Example 1: Simple Page (`ModelDetail`)

This is the "simple" case, as previously outlined.

**Create File:** `orw-deno/routes/partials/model/[id].tsx`
*   This file will contain a handler that fetches a single model from the watcher, generates an ETag, and renders the `islands/ModelDetail.tsx` component within a `<Partial name="body">`.

**Update File:** `orw-deno/islands/ModelList.tsx`
*   The links to the model detail pages will be updated to use `f-partial`: `<a href="/model/..." f-partial="/partials/model/...">`.

### 3.3. Example 2: Complex Interactive Page (`ChangeList`)

This example addresses how to handle a page that needs a large amount of data for client-side filtering.

**The Goal:** The user should only download the huge `changes` list when it has actually changed on the server.

**Create File:** `orw-deno/routes/partials/changes.tsx`

```tsx
// orw-deno/routes/partials/changes.tsx

import { Handlers, PageProps, RouteConfig } from "fresh";
import { Partial } from "fresh/runtime.ts";
import ChangeList from "../../../islands/ChangeList.tsx";
import { getWatcher } from "../../../server/index.ts";
import type { Change } from "../../../lib/types.ts";
import { createHash } from "https://deno.land/std@0.190.0/crypto/mod.ts";

export const config: RouteConfig = {
  skipAppWrapper: true,
  skipInheritedLayouts: true,
};

// This function now generates an ETag from the entire list of changes
async function generateEtagForChanges(data: Change[]): Promise<string> {
  const dataString = JSON.stringify(data);
  const hash = createHash("sha-1");
  hash.update(dataString);
  return hash.toString();
}

export const handler: Handlers<Change[]> = {
  async GET(ctx) {
    const watcher = await getWatcher();
    const changes = watcher.allLists.changes; // Get the FULL list

    // Generate the ETag based on the full list
    const etag = await generateEtagForChanges(changes);

    const ifNoneMatch = ctx.req.headers.get("if-none-match");
    if (ifNoneMatch === etag) {
      // The client's version is up-to-date. Send nothing.
      return new Response(null, { status: 304 });
    }

    // The data has changed. Render the component with the full list
    // and send it to the client with the new ETag.
    const headers = new Headers();
    headers.set("ETag", etag);
    return ctx.render(changes, { headers });
  },
};

// The component receives the full list and renders the interactive island
export default function ChangesPartial({ data }: PageProps<Change[]>) {
  return (
    <Partial name="body">
      <ChangeList changes={data} />
    </Partial>
  );
}
```

**Update File:** `orw-deno/islands/NavBar.tsx` (and any other links to the changes page)
*   The "Changes" link will be updated: `<a href="/changes" f-partial="/partials/changes">Changes</a>`.

**How This Works:**
1.  When the user clicks the "Changes" link, the browser requests `/partials/changes`.
2.  The server fetches the huge `changes` list and calculates its ETag.
3.  **If the list hasn't changed,** the server sends back an empty `304 Not Modified` response. The browser doesn't update the DOM, and no data is transferred. The user's existing client-side version of the page remains.
4.  **If the list *has* changed,** the server renders the `ChangeList` component, passing the *entire new list* as a prop. This small HTML fragment (which contains the large JSON prop) is sent to the client. The client swaps this new `ChangeList` into the DOM.

This perfectly achieves the desired outcome: the large data payload is only sent when it has actually changed.
