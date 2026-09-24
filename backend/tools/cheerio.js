import { tool } from "@langchain/core/tools";
import { z } from "zod";
import * as cheerio from "cheerio";

/**
 * Helper to scrape a single webpage URL using Cheerio
 * Includes timeout and User-Agent headers to avoid getting blocked.
 */
export async function scrapeWebpage(url, timeoutMs = 8000) {
  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    return {
      url,
      title: "Invalid URL",
      content: "",
      error: "URL must start with http:// or https://",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        url,
        title: "",
        content: "",
        error: `HTTP error ${response.status}: ${response.statusText}`,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove noise and clutter elements
    $("script, style, nav, footer, noscript, svg, iframe, header, aside, .advertisement, .ads, [role='banner']").remove();

    const title = $("title").text().trim() || $("h1").first().text().trim() || "Webpage Content";

    // Extract content from semantic article/main tags or fallback to body
    let rawText = "";
    if ($("article").length > 0) {
      rawText = $("article").text();
    } else if ($("main").length > 0) {
      rawText = $("main").text();
    } else {
      rawText = $("body").text();
    }

    // Clean whitespace and linebreaks
    const cleanedText = rawText
      .replace(/\r\n|\r|\n/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    // Limit characters to avoid exceeding model context window
    const maxChars = 5000;
    const content = cleanedText.length > maxChars 
      ? cleanedText.slice(0, maxChars) + "... [Content truncated for summary]"
      : cleanedText;

    return {
      url,
      title,
      content,
      length: content.length,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    return {
      url,
      title: "",
      content: "",
      error: error.name === "AbortError" ? "Request timed out after 8s" : error.message,
    };
  }
}

/**
 * Helper to scrape multiple URLs concurrently with concurrency limit
 */
export async function scrapeMultipleUrls(urls = [], maxConcurrent = 3) {
  const validUrls = (Array.isArray(urls) ? urls : [urls]).filter(
    (u) => typeof u === "string" && u.startsWith("http")
  );

  const results = [];
  for (let i = 0; i < validUrls.length; i += maxConcurrent) {
    const batch = validUrls.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(batch.map((u) => scrapeWebpage(u)));
    results.push(...batchResults);
  }

  return results.filter((r) => !r.error && r.content.length > 50);
}

/**
 * Cheerio Web Scraper LangChain Tool
 */
export const cheerioTool = tool(
  async ({ url }) => {
    const result = await scrapeWebpage(url);
    if (result.error) {
      return JSON.stringify({ error: result.error, url });
    }
    return JSON.stringify(result);
  },
  {
    name: "scrape_webpage",
    description:
      "Scrapes and extracts the readable text content from a specific webpage URL. Use this when you have a URL and need to read its full details.",
    schema: z.object({
      url: z.string().url().describe("The full web URL (e.g. https://example.com) to scrape and read"),
    }),
  }
);

export default cheerioTool;
