# Migration Roadmap: `f-partial` Adoption

## Phase 1: Foundational Setup (1-2 hours)

This phase lays the groundwork for the entire migration.

1.  **[ ] Wrap the App in a Partial:**
    *   **Task:** Modify `routes/_app.tsx` to wrap the `<Component />` in a `<Partial name="main-content">`.
    *   **File:** `routes/_app.tsx`
    *   **Purpose:** This defines the primary content area that will be dynamically updated.

2.  **[ ] Enable Client-Side Navigation:**
    *   **Task:** Add the `f-client-nav` attribute to the `<body>` tag in `routes/_app.tsx`.
    *   **File:** `routes/_app.tsx`
    *   **Purpose:** This enables Fresh's partial navigation system for the entire application.

3.  **[ ] Create Partials Directory:**
    *   **Task:** Create a new directory `routes/partials/`.
    *   **Purpose:** This will house all the new dedicated partial-rendering routes, keeping the project organized.

## Phase 2: Pilot Implementation - The Model View (2-4 hours)

This phase focuses on implementing the `f-partial` strategy on the most critical workflow: navigating from the model list to the model detail view.

1.  **[ ] Create the Model Detail Partial Route:**
    *   **Task:** Create the new file `routes/partials/model-detail/[id].tsx`.
    *   **Details:** Implement the handler to fetch model data, generate an ETag, and render the `islands/ModelDetail.tsx` component within a `<Partial>`.
    *   **Reference:** Use the code from the Design Document.

2.  **[ ] Update Links in `ModelList`:**
    *   **Task:** Modify the `<a>` tags in `islands/ModelList.tsx` to include the `f-partial` attribute, pointing to the new partial route.
    *   **File:** `islands/ModelList.tsx`

3.  **[ ] Test the Workflow:**
    *   **Task:** Run the application and verify that navigating from the home page to a model detail page updates the content without a full page reload.
    *   **Verification:** Use your browser's developer tools to inspect the network requests. You should see `fetch` requests to `/partials/model-detail/...` and the payload should be small HTML fragments, not the full page. On second click to the same model, you should see a `304 Not Modified` response.

## Phase 3: Expansion to Other Routes (3-5 hours)

Once the pilot is successful, apply the same pattern to the other main navigation paths.

1.  **[ ] Implement the "Changes" View Partial:**
    *   **Task:** Create `routes/partials/changes-list.tsx`.
    *   **Task:** Update the "Changes" link in `islands/NavBar.tsx` to use `f-partial`.

2.  **[ ] Implement the "Removed" View Partial:**
    *   **Task:** Create `routes/partials/removed-list.tsx`.
    *   **Task:** Update the "Removed" link in `islands/NavBar.tsx` to use `f-partial`.

3.  **[ ] Implement the "List" View Partial (if applicable):**
    *   **Task:** If `routes/list.tsx` is a distinct and frequently used view, create a corresponding partial route for it and update its navigation link.

4.  **[ ] Regression Test:**
    *   **Task:** After each implementation, click through the site to ensure all navigation works as expected and that partials are loading correctly.

## Phase 4: Verification and Monitoring

This final phase is about confirming the success of the migration.

1.  **[ ] Full End-to-End Testing:**
    *   **Task:** Thoroughly test all navigation paths and user interactions related to the new partials.

2.  **[ ] Performance Measurement:**
    *   **Task:** Re-evaluate the network payload size for the optimized routes.
    *   **Expected Outcome:** The data transfer for partial navigations should be reduced from ~2MB to a few kilobytes.

3.  **[ ] Documentation:**
    *   **Task:** Briefly document the new `f-partial` pattern in your project's `README.md` or a similar location, so that all developers on the team understand how to use it for future development.
