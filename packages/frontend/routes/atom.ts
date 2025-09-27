// routes/atom.ts - Atom feed endpoint for OpenRouter model changes
import { define, getAppConfig } from "../utils.ts";
import { getWatcher } from "@orw/server";
import { Feed } from "feed";
import type { ModelDiff } from "../lib/types.ts";
import { WATCHER_INTERVAL_MS } from "../lib/constants.ts";
import { calculatePercentageChange, formatChangeValue } from "../lib/utils.ts";

// Cache for Atom feed to avoid regenerating on every request
let atomCache: {
  xml: string;
  lastGenerated: Date;
  dbLastChange: Date;
} | null = null;

/**
 * Renders a change snippet as HTML for Atom feed description
 */
function renderChangeSnippetHTML(change: ModelDiff): string {
  if (change.type === "added") {
    return `<p><strong>New model added:</strong> ${change.id}</p>
            <pre style="white-space: pre-wrap; word-wrap: break-word;"><code>${
      JSON.stringify(change.model, null, 2)
    }</code></pre>`;
  }

  if (change.type === "removed") {
    return `<p><strong>Model removed:</strong> ${change.id}</p>
            <pre style="white-space: pre-wrap; word-wrap: break-word;"><code>${
      JSON.stringify(change.model, null, 2)
    }</code></pre>`;
  }

  if (change.type === "changed" && change.changes) {
    const changeEntries = Object.entries(change.changes);
    const changesHTML = changeEntries
      .slice(0, 5) // Show first 5 changes in Atom
      .map(([path, changeItem]) => {
        const oldFormatted = formatChangeValue(changeItem.old, path);
        const newFormatted = formatChangeValue(changeItem.new, path);
        const percentageChange = calculatePercentageChange(
          changeItem.old,
          changeItem.new,
        );

        return `<li><strong>${path}:</strong> ${oldFormatted} → ${newFormatted}${percentageChange}</li>`;
      })
      .join("");

    const moreChanges = changeEntries.length > 5
      ? `<li><em>... and ${changeEntries.length - 5} more changes</em></li>`
      : "";

    return `<p><strong>Model updated:</strong> ${change.id}</p>
            <ul>${changesHTML}${moreChanges}</ul>`;
  }

  return `<p><strong>Change detected for model:</strong> ${change.id}</p>`;
}

/**
 * Calculates the time left until the next API check, which is when Atom feed might change.
 * This provides intelligent cache timing: Atom clients cache until just before new changes could appear.
 */
function calculateCacheMaxAge(watcherStatus: { apiLastCheck: Date }): number {
  const timeSinceLastCheck = Date.now() - watcherStatus.apiLastCheck.getTime();
  const timeUntilNextCheck = WATCHER_INTERVAL_MS - timeSinceLastCheck;

  // Ensure we have at least 60 seconds cache time, but not more than 1 hour
  const maxAgeSeconds = Math.max(
    60,
    Math.min(Math.floor(timeUntilNextCheck / 1000), 3600),
  );

  return maxAgeSeconds;
}

/**
 * Generates Atom feed XML
 */
async function generateAtomFeed(): Promise<string> {
  const watcher = await getWatcher();
  const watcherStatus = watcher.watcherStatus;
  const config = getAppConfig();

  // Check if we can use cached version
  if (
    atomCache &&
    atomCache.dbLastChange.getTime() === watcherStatus.dbLastChange.getTime()
  ) {
    return atomCache.xml;
  }

  // Get the base URL from config
  const baseURL = new URL(config.publicUrl);

  const feedOptions = {
    title: "OpenRouter Model Changes",
    description: "Feed for detected changes in the OpenRouter model list",
    author: { name: "fry69", link: "https://fry69.dev/" },
    id: `${baseURL}`,
    link: `${baseURL}`,
    feedLinks: {
      atom: `${baseURL}atom`,
    },
    feed_url: `${baseURL}atom`,
    favicon: `${baseURL}favicon.png`,
    language: "en",
    ttl: 60,
    date: watcherStatus.dbLastChange,
    copyright: "MIT",
  };

  const feed = new Feed(feedOptions);

  // Get last 50 changes, sorted newest first
  const lists = watcher.allLists;
  const changesForAtom = lists.changes
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);

  for (const change of changesForAtom) {
    let changeTypeText: string;

    switch (change.type) {
      case "added":
        changeTypeText = "added";
        break;
      case "removed":
        changeTypeText = "removed";
        break;
      default:
        changeTypeText = "updated";
    }

    feed.addItem({
      title: `Model ${change.id} ${changeTypeText}`,
      description: `Model ${change.id} ${changeTypeText} on ${change.timestamp}`,
      content: renderChangeSnippetHTML(change),
      link: `${baseURL}model/${encodeURIComponent(change.id)}`,
      date: new Date(change.timestamp),
      published: new Date(change.timestamp),
      id: `${baseURL}model/${encodeURIComponent(change.id)}#${change.timestamp}`, // Unique identifier for each change
    });
  }

  const xml = feed.atom1();

  // Update cache
  atomCache = {
    xml,
    lastGenerated: new Date(),
    dbLastChange: watcherStatus.dbLastChange,
  };

  return xml;
}

export const handler = define.handlers({
  async GET() {
    try {
      const watcher = await getWatcher();
      const watcherStatus = watcher.watcherStatus;

      const atomXML = await generateAtomFeed();

      // Calculate dynamic cache time based on when next API check will happen
      const cacheMaxAge = calculateCacheMaxAge(watcherStatus);

      return new Response(atomXML, {
        headers: {
          "Content-Type": "application/atom+xml; charset=utf-8",
          "Cache-Control": `public, max-age=${cacheMaxAge}`,
        },
      });
    } catch (error) {
      console.error("Error generating Atom feed:", error);

      return new Response(
        "Error generating Atom feed",
        {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        },
      );
    }
  },
});
