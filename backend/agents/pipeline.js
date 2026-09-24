import { searchNews } from "../tools/tavily.js";
import { scrapeMultipleUrls } from "../tools/cheerio.js";
import { writerAgent, criticAgent, refinerAgent } from "./agent.js";

/**
 * Multi-Agent Research Pipeline (Simple & Easy to Understand)
 * 
 * 1. Tavily Search -> Find top articles on the web
 * 2. Cheerio Scraper -> Read full text from top URLs
 * 3. Writer Agent -> Write the initial draft report
 * 4. Critic Agent -> Review draft and suggest improvements
 * 5. Refiner Agent -> Produce the final, polished report
 */
export async function runPipeline(query, onProgress = () => {}) {
  const topic = query.trim();
  const startTime = Date.now();

  console.log(`\n🚀 Starting research for: "${topic}"`);

  // STEP 1: Search the web with Tavily
  onProgress({ step: "search", message: `Searching Tavily for "${topic}"...` });
  const searchData = await searchNews(topic);
  const searchResults = searchData.results || [];
  console.log(`✅ Step 1: Found ${searchResults.length} web links`);

  // STEP 2: Scrape web pages with Cheerio
  onProgress({ step: "scrape", message: "Scraping full article text with Cheerio..." });
  const urlsToScrape = searchResults.slice(0, 3).map((r) => r.url);
  const scrapedArticles = await scrapeMultipleUrls(urlsToScrape);
  console.log(`✅ Step 2: Scraped ${scrapedArticles.length} pages`);

  // STEP 3: Write Draft Report
  onProgress({ step: "write", message: "Writer Agent drafting initial report..." });
  const researchText = `
SEARCH SNIPPETS:
${searchResults.map((s) => `- ${s.title}: ${s.content} (${s.url})`).join("\n")}

PAGE CONTENTS:
${scrapedArticles.map((a) => `[${a.title}]: ${a.content.slice(0, 1500)}`).join("\n\n")}
`;

  const draftReport = await writerAgent(topic, researchText);
  console.log(`✅ Step 3: Draft report created (${draftReport.length} chars)`);

  // STEP 4: Critic Reviews Draft
  onProgress({ step: "critique", message: "Critic Agent reviewing draft for improvements..." });
  const criticFeedback = await criticAgent(topic, draftReport);
  console.log(`✅ Step 4: Critic review complete`);

  // STEP 5: Refiner Polishes Final Report
  onProgress({ step: "refine", message: "Refiner Agent polishing final report..." });
  const finalReport = await refinerAgent(topic, draftReport, criticFeedback);
  console.log(`✅ Step 5: Final polished report ready!`);

  const durationMs = Date.now() - startTime;

  return {
    topic,
    searchResults,
    scrapedArticles,
    draftReport,
    criticFeedback,
    finalReport,
    durationMs,
  };
}

export default runPipeline;
