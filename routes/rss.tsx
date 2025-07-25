// routes/rss.tsx - RSS feed endpoint
import { getGlobalWatcher } from "../main.ts";
import type { ModelDiff } from "../shared/global.ts";

export async function handler(_req: Request): Promise<Response> {
  try {
    const watcher = await getGlobalWatcher();
    const lists = watcher.getLists;

    // Generate RSS XML
    const rssContent = generateRSSFeed(lists.changes.slice(0, 50)); // Latest 50 changes

    return new Response(rssContent, {
      headers: {
        "content-type": "application/rss+xml",
        "cache-control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("RSS generation error:", error);
    return new Response("Error generating RSS feed", { status: 500 });
  }
}

function generateRSSFeed(changes: ModelDiff[]): string {
  const now = new Date().toUTCString();
  const baseUrl = "https://orw.karleo.net";

  let items = "";
  for (const change of changes) {
    const pubDate = new Date(change.timestamp).toUTCString();
    const title = `${change.type.toUpperCase()}: ${change.id}`;
    let description = `Model ${change.id} was ${change.type}`;

    if (change.type === "changed" && change.changes) {
      const changeKeys = Object.keys(change.changes);
      description += ` - ${changeKeys.join(", ")} modified`;
    }

    items += `
    <item>
      <title><![CDATA[${title}]]></title>
      <description><![CDATA[${description}]]></description>
      <link>${baseUrl}/changes</link>
      <guid isPermaLink="false">${change.id}-${change.timestamp}</guid>
      <pubDate>${pubDate}</pubDate>
    </item>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>OpenRouter Model Changes</title>
    <description>Latest changes to OpenRouter AI models</description>
    <link>${baseUrl}</link>
    <lastBuildDate>${now}</lastBuildDate>
    <language>en-us</language>
    <generator>OpenRouter API Watcher</generator>
    ${items}
  </channel>
</rss>`;
}
