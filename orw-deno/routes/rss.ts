// routes/rss.ts - RSS feed endpoint for OpenRouter model changes
import { define, getAppConfig } from "../utils.ts";
import { getWatcher } from "../server/index.ts";
import RSS from "rss";
import type { ModelDiff } from "../lib/types.ts";
import { WATCHER_INTERVAL_MS } from "../lib/constants.ts";
import { showPricePerMillion, formatNumber } from "../lib/utils.ts";

// Cache for RSS feed to avoid regenerating on every request
let rssCache: {
  xml: string;
  lastGenerated: Date;
  dbLastChange: Date;
} | null = null;

/**
 * Formats a single change value for RSS display
 */
function formatChangeValue(value: unknown, path: string): string {
  if (value === null) return "[null]";
  if (value === undefined) return "[undefined]";

  // Handle pricing fields with proper formatting
  if (path.includes("pricing.")) {
    if (typeof value === "string") {
      return `${showPricePerMillion(value)} per million tokens`;
    }
  }

  // Handle numbers with locale formatting
  if (typeof value === "number") {
    return formatNumber(value);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[${value.join(", ")}]`;
  }

  // Default: JSON stringify but without quotes for simple values
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/**
 * Calculates percentage change for numeric values
 */
function calculatePercentageChange(oldVal: unknown, newVal: unknown): string {
  if (typeof oldVal !== "number" || typeof newVal !== "number") return "";
  if (oldVal === 0) return "";

  const change = ((newVal - oldVal) / oldVal) * 100;
  const sign = change >= 0 ? "+" : "";
  return ` (${sign}${Math.round(change)}%)`;
}

/**
 * Renders a change snippet as HTML for RSS feed description
 */
function renderChangeSnippetHTML(change: ModelDiff): string {
  if (change.type === "added") {
    return `<p><strong>New model added:</strong> ${change.id}</p>
            <pre><code>${JSON.stringify(change.model, null, 2)}</code></pre>`;
  }

  if (change.type === "removed") {
    return `<p><strong>Model removed:</strong> ${change.id}</p>
            <pre><code>${JSON.stringify(change.model, null, 2)}</code></pre>`;
  }

  if (change.type === "changed" && change.changes) {
    const changeEntries = Object.entries(change.changes);
    const changesHTML = changeEntries
      .slice(0, 5) // Show first 5 changes in RSS
      .map(([path, changeItem]) => {
        const oldFormatted = formatChangeValue(changeItem.old, path);
        const newFormatted = formatChangeValue(changeItem.new, path);

        // Calculate percentage change for pricing fields
        let percentageChange = "";
        if (path.includes("pricing.") && typeof changeItem.old === "string" && typeof changeItem.new === "string") {
          const oldPrice = parseFloat(changeItem.old);
          const newPrice = parseFloat(changeItem.new);
          if (!isNaN(oldPrice) && !isNaN(newPrice)) {
            percentageChange = calculatePercentageChange(oldPrice, newPrice);
          }
        }

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
 * Calculates the time left until the next API check, which is when RSS feed might change.
 * This provides intelligent cache timing: RSS clients cache until just before new changes could appear.
 */
function calculateCacheMaxAge(watcherStatus: { apiLastCheck: Date }): number {
  const timeSinceLastCheck = Date.now() - watcherStatus.apiLastCheck.getTime();
  const timeUntilNextCheck = WATCHER_INTERVAL_MS - timeSinceLastCheck;

  // Ensure we have at least 60 seconds cache time, but not more than 1 hour
  const maxAgeSeconds = Math.max(60, Math.min(Math.floor(timeUntilNextCheck / 1000), 3600));

  return maxAgeSeconds;
} /**
 * Generates RSS feed XML
 */

async function generateRSSFeed(): Promise<string> {
  const watcher = await getWatcher();
  const watcherStatus = watcher.watcherStatus;
  const config = getAppConfig();

  // Check if we can use cached version
  if (
    rssCache &&
    rssCache.dbLastChange.getTime() === watcherStatus.dbLastChange.getTime()
  ) {
    return rssCache.xml;
  }

  // Get the base URL from config
  const baseURL = config.publicUrl;

  const feedOptions = {
    title: "OpenRouter Model Changes",
    description: "Feed for detected changes in the OpenRouter model list",
    feed_url: `${baseURL}/rss`,
    site_url: baseURL,
    image_url: `${baseURL}/favicon.svg`,
    language: "en",
    ttl: 60,
    pubDate: watcherStatus.dbLastChange,
    ...(config.repositoryUrl && { docs: config.repositoryUrl }),
  };

  const feed = new RSS(feedOptions);

  // Get last 50 changes, sorted newest first
  const lists = watcher.allLists;
  const changesForRSS = lists.changes
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);

  for (const change of changesForRSS) {
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

    feed.item({
      title: `Model ${change.id} ${changeTypeText}`,
      description: renderChangeSnippetHTML(change),
      url: `${baseURL}/model/${encodeURIComponent(change.id)}`,
      date: new Date(change.timestamp),
      guid: `${change.id}-${change.timestamp}`, // Unique identifier for each change
    });
  }

  const xml = feed.xml();

  // Update cache
  rssCache = {
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

      const rssXML = await generateRSSFeed();

      // Calculate dynamic cache time based on when next API check will happen
      const cacheMaxAge = calculateCacheMaxAge(watcherStatus);

      return new Response(rssXML, {
        headers: {
          "Content-Type": "application/rss+xml; charset=utf-8",
          "Cache-Control": `public, max-age=${cacheMaxAge}`,
        },
      });
    } catch (error) {
      console.error("Error generating RSS feed:", error);

      return new Response(
        "Error generating RSS feed",
        {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        },
      );
    }
  },
});
