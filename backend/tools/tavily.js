import "dotenv/config";
import { TavilySearch } from "@langchain/tavily";

/**
 * Tavily Search Tool
 * Automatically reads TAVILY_API_KEY from process.env.
 * Searches the web for real-time information, returning URLs, titles, and snippet summaries.
 */
export const tavilyTool = new TavilySearch({
  maxResults: 5,
});

/**
 * Direct search helper function
 * Accepts either a string query or an options object
 */
export async function searchNews(query = "Latest AI agents and Generative AI updates", options = {}) {
  try {
    const searchQuery = typeof query === "string" ? query : query?.query || "";
    const maxResults = options.maxResults || 5;

    // TavilySearch invoke requires { query: string } schema
    const rawResult = await tavilyTool.invoke({
      query: searchQuery,
      maxResults,
    });

    // Normalize output structure
    let results = [];
    if (typeof rawResult === "string") {
      try {
        const parsed = JSON.parse(rawResult);
        results = parsed.results || (Array.isArray(parsed) ? parsed : [parsed]);
      } catch {
        results = [{ title: "Search Result", url: "", content: rawResult }];
      }
    } else if (rawResult && Array.isArray(rawResult.results)) {
      results = rawResult.results;
    } else if (Array.isArray(rawResult)) {
      results = rawResult;
    } else if (rawResult && typeof rawResult === "object") {
      results = rawResult.results || [rawResult];
    }

    return {
      query: searchQuery,
      results: results.map((item) => ({
        title: item.title || "Web Result",
        url: item.url || "",
        content: item.content || item.snippet || "",
        score: item.score || 1,
      })),
    };
  } catch (error) {
    console.error("Tavily search error:", error.message || error);
    throw error;
  }
}

export default tavilyTool;
