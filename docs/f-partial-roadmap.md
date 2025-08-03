# Migration Roadmap: `f-partial` Adoption (Revised)

This roadmap provides a clear, step-by-step plan for implementing the `f-partial` optimization strategy, tailored to the specific architecture of this project.

## Phase 1: Foundational Setup (0.5 hours)

This phase is now much shorter as the foundational elements are mostly in place.

1.  **[x] Confirm Partial Wrapper:**
    *   **Task:** Verify that `routes/_app.tsx` wraps the main component in `<Partial name="body">`.
    *   **Status:** **Already complete.**

2.  **[x] Confirm Client-Side Navigation:**
    *   **Task:** Verify that the `<body>` tag in `routes/_app.tsx` has the `f-client-nav` attribute.
    *   **Status:** **Already complete.**

3.  **[ ] Create Partials Directory:**
    *   **Task:** Create a new directory: `orw-deno/routes/partials/`.
    *   **Purpose:** To house the new, dedicated partial-rendering routes.

## Phase 2: Pilot Implementation - The Model View (2-3 hours)

This phase focuses on the highest-impact workflow: navigating from the model list to a model detail view.

1.  **[ ] Create the Model Detail Partial Route:**
    *   **Task:** Create the new file `orw-deno/routes/partials/model/[id].tsx`.
    *   **Details:** Implement the handler as specified in the revised Design Document. It must fetch its own data and have `skipAppWrapper: true` in its config.
    *   **Reference:** Use the code from the **Revised Design Document**.

2.  **[ ] Update Links in `ModelList`:**
    *   **Task:** Modify the `<a>` tags in `orw-deno/islands/ModelList.tsx` to include the `f-partial` attribute.
    *   **Example:** `f-partial="/partials/model/{model.id}"`

3.  **[ ] Test the Workflow:**
    *   **Task:** Run the application and navigate from the home page to a model detail page.
    *   **Verification:** Use browser dev tools to inspect the network request.
        *   It should be a `fetch` request to `/partials/model/...`.
        *   The response payload should be a small HTML fragment, not a full page.
        *   The response should **not** contain the `DataInitializer` island or the `commonData` prop.
        *   Clicking the same link again should result in a `304 Not Modified` response.

## Phase 3: Expansion to Other Routes (3-5 hours)

Apply the same pattern to the main navigation links in the navbar.

1.  **[ ] Implement the "Changes" View Partial:**
    *   **Task:** Create a new route `orw-deno/routes/partials/changes.tsx`.
    *   **Details:** This route's handler will fetch the changes list and render the `islands/ChangeList.tsx` component inside a `<Partial name="body">`. Remember to include the `skipAppWrapper: true` config.
    *   **Task:** Update the "Changes" link in `orw-deno/islands/NavBar.tsx` to use `f-partial="/partials/changes"`.

2.  **[ ] Implement the "Removed" View Partial:**
    *   **Task:** Create `orw-deno/routes/partials/removed.tsx`.
    *   **Details:** Similar to the "Changes" partial, this will render the `islands/ModelList.tsx` (or a dedicated "removed list" component) with the list of removed models.
    *   **Task:** Update the "Removed" link in `orw-deno/islands/NavBar.tsx` to use `f-partial="/partials/removed"`.

3.  **[ ] Implement the "Home/List" View Partial:**
    *   **Task:** Create `orw-deno/routes/partials/home.tsx`.
    *   **Details:** This will render the `islands/ModelList.tsx` with the main list of models.
    *   **Task:** Update the main "Home" or "Model List" link in `orw-deno/islands/NavBar.tsx` to use `f-partial="/partials/home"`.

4.  **[ ] Regression Test:**
    *   **Task:** After implementing each partial, thoroughly test the navigation to ensure the correct content is loaded and the URL is updated properly.

## Phase 4: Verification and Monitoring

Confirm the success of the migration.

1.  **[ ] Full End-to-End Testing:**
    *   **Task:** Test all navigation paths, including browser back/forward buttons, to ensure a seamless experience.

2.  **[ ] Performance Measurement:**
    *   **Task:** Re-evaluate the network payload size for all optimized routes.
    *   **Expected Outcome:** The data transfer for all partial navigations should be dramatically reduced from ~2MB to just a few kilobytes.

3.  **[ ] Code Cleanup (Optional):**
    *   **Task:** The original `routes/model/[id].tsx`, `routes/changes.tsx`, etc., are now only used for full page loads (e.g., when a user navigates directly to the URL). You can potentially simplify the data loading in these routes if desired, as the heavy lifting for navigation is now done by the partials. This is not essential but can be a good cleanup step.
