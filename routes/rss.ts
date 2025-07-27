// routes/rss.ts - RSS feed endpoint for OpenRouter model changes
import { define } from "../lib/app.ts";
import { getGlobalWatcher } from "../server/index.ts";
import RSS from "rss";
import type { ModelDiff } from "../types/global.ts";

// Cache for RSS feed to avoid regenerating on every request
let rssCache: {
  xml: string;
  lastGenerated: Date;
  dbLastChange: Date;
} | null = null;

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
        const oldValue = JSON.stringify(changeItem.old);
        const newValue = JSON.stringify(changeItem.new);
        return `<li><strong>${path}:</strong><br/>
                    <span style="color: #cc0000;">OLD:</span> ${oldValue}<br/>
                    <span style="color: #00cc00;">NEW:</span> ${newValue}</li>`;
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
 * Generates RSS feed XML
 */
async function generateRSSFeed(): Promise<string> {
  const watcher = await getGlobalWatcher();
  const watcherStatus = watcher.watcherStatus;

  // Check if we can use cached version
  if (rssCache &&
      rssCache.dbLastChange.getTime() === watcherStatus.dbLastChange.getTime()) {
    return rssCache.xml;
  }

  // Get the base URL from environment or default
  const baseURL = Deno.env.get("ORW_PUBLIC_URL") ||
                  Deno.env.get("PUBLIC_URL") ||
                  `http://localhost:${Deno.env.get("PORT") || "8000"}`;

  const feed = new RSS({
    title: "OpenRouter Model Changes",
    description: "Feed for detected changes in the OpenRouter model list",
    feed_url: `${baseURL}/rss`,
    site_url: baseURL,
    image_url: `${baseURL}/favicon.svg`,
    docs: "https://github.com/fry69/orw",
    language: "en",
    ttl: 60,
    pubDate: watcherStatus.dbLastChange,
  });

  // Get last 50 changes, sorted newest first
  const lists = watcher.allLists;
  const changesForRSS = lists.changes
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);

  for (const change of changesForRSS) {
    const changeTypeText = change.type === "added" ? "added" :
                          change.type === "removed" ? "removed" : "updated";

    feed.item({
      title: `Model ${change.id} ${changeTypeText}`,
      description: renderChangeSnippetHTML(change),
      url: `${baseURL}/changes?filter=${encodeURIComponent(change.id)}`,
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
      const rssXML = await generateRSSFeed();

      return new Response(rssXML, {
        headers: {
          "Content-Type": "application/rss+xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        },
      });
    } catch (error) {
      console.error("Error generating RSS feed:", error);

      return new Response(
        "Error generating RSS feed",
        {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        }
      );
    }
  },
});
