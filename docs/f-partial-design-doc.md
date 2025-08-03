# Design Document: Fresh 2 Partials Optimization (Revised)

## 1. Overview & Analysis

This document outlines a revised strategy to optimize the application's use of Fresh 2 Partials. The goal is to create a highly efficient, hybrid architecture that leverages the strengths of both server-side rendering and client-side navigation.

**Problem:** The application experiences large data transfers (~2MB) on every route change due to the global middleware loading all data for every request.

**Solution:** Use `f-partial` for all client-side navigations to fetch minimal HTML fragments from dedicated partial routes. These routes will bypass the global middleware and use a highly efficient, pre-calculated ETag caching strategy to avoid redundant data processing and transfer.

## 2. The Hybrid Architecture: Middleware vs. Partials

*   **`_middleware.ts` (For Initial Load):**
    *   **Role:** Handles the first-time, full-page load.
    *   **Function:** Loads all necessary data via the `watcher` and uses the `DataInitializer` to populate the client-side state (Signals).
    *   **Benefit:** Provides a rich, fast initial experience. This functionality should be kept as is.

*   **Partial Routes (For Subsequent Navigation):**
    *   **Role:** Handle all client-side navigations after the initial load.
    *   **Function:** Bypass the global middleware (`skipAppWrapper: true`). They fetch minimal, pre-rendered HTML fragments.
    *   **Benefit:** Makes navigation feel instantaneous by minimizing data transfer and server processing.

## 3. Advanced ETag Caching Strategy

To maximize performance and avoid re-calculating hashes on every request, we will implement a **pre-calculated ETag caching** strategy.

**Concept:** Instead of calculating a list's ETag on-demand in the route handler, the `watcher` will calculate it **once** when the data changes. This ETag is then cached (in-memory and in the database) and re-used for all subsequent requests until the data changes again.

### 3.1. Database Schema for ETag Cache

A new table will be added to the SQLite database to persist ETags across server restarts.

**Proposed Schema:**
```sql
CREATE TABLE etag_cache (
  list_name TEXT PRIMARY KEY,
  etag_value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 3.2. `watcher` Modifications (Conceptual)

The `server/watcher.ts` will be updated with the following logic:
1.  **On startup:** Load the latest ETags from the `etag_cache` table into an in-memory object (e.g., `this.etags = { changes: '...', models: '...' }`).
2.  **After fetching new data:**
    *   If the data for a list has changed, calculate a new ETag for it.
    *   Update the in-memory ETag value (`this.etags.changes = newEtag`).
    *   Save the new ETag to the `etag_cache` table in the database.
3.  **Provide a getter:** Expose a method like `getEtag(listName: string): string` to be used by the route handlers.

## 4. Revised Implementation Plan

### 4.1. Example: Complex Interactive Page (`ChangeList`)

This example demonstrates the full, optimized pattern.

**Step 1: Update the `watcher`**
*   Implement the ETag caching logic described in section 3.2.

**Step 2: Create the Partial Route**
*   **File:** `orw-deno/routes/partials/changes.tsx`

```tsx
// orw-deno/routes/partials/changes.tsx

import { Handlers, PageProps, RouteConfig } from "fresh";
import { Partial } from "fresh/runtime.ts";
import ChangeList from "../../../islands/ChangeList.tsx";
import { getWatcher } from "../../../server/index.ts";
import type { Change } from "../../../lib/types.ts";

export const config: RouteConfig = {
  skipAppWrapper: true,
  skipInheritedLayouts: true,
};

export const handler: Handlers<Change[]> = {
  async GET(ctx) {
    const watcher = await getWatcher();

    // 1. Get the pre-calculated ETag from the watcher. No hashing is done here.
    const etag = watcher.getEtag('changes');

    const ifNoneMatch = ctx.req.headers.get("if-none-match");
    if (ifNoneMatch === etag) {
      // 2. The client's version is up-to-date. Return 304 immediately.
      return new Response(null, { status: 304 });
    }

    // 3. The data has changed. Get the full list from the watcher.
    const changes = watcher.allLists.changes;

    // 4. Render the component and send it with the new ETag.
    const headers = new Headers();
    headers.set("ETag", etag);
    return ctx.render(changes, { headers });
  },
};

// The component itself remains the same
export default function ChangesPartial({ data }: PageProps<Change[]>) {
  return (
    <Partial name="body">
      <ChangeList changes={data} />
    </Partial>
  );
}
```

**Step 3: Update Navigation Links**
*   **File:** `orw-deno/islands/NavBar.tsx`
*   **Action:** Update the "Changes" link: `<a href="/changes" f-partial="/partials/changes">Changes</a>`.

### 4.2. How This Solves the Performance Issue

*   **On Cache Hit (`304`):** The server's work is reduced to a single in-memory lookup (`watcher.getEtag()`) and a string comparison. This is extremely fast and computationally cheap.
*   **On Cache Miss (`200`):** The server still avoids expensive on-demand hashing. It simply retrieves the data and the pre-calculated ETag from the watcher's memory.

This revised strategy provides the most performant and scalable solution, directly addressing the concern about repeated hash calculations.
