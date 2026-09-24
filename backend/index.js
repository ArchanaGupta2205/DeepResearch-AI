import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { runPipeline } from "./agents/pipeline.js";
import { Research } from "./models/Research.js";
import { searchNews } from "./tools/tavily.js";
import { scrapeWebpage } from "./tools/cheerio.js";

const app = express();

app.use(cors());
app.use(express.json());

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/genai_research";
let isDbConnected = false;

mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 4000 })
  .then(() => {
    isDbConnected = true;
    console.log(" Connected to MongoDB successfully at:", MONGODB_URI);
  })
  .catch((err) => {
    console.warn("⚠️ MongoDB connection warning (app will work with fallback):", err.message);
  });

/* ----------------------------------------------------
 * ROUTES
 * ---------------------------------------------------- */

// Health & diagnostics
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "GenAI Multi-Agent Research System (MERN)",
    database: isDbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// Run research pipeline with Server-Sent Events (SSE) for live streaming progress
app.get("/api/research/stream", async (req, res) => {
  const query = req.query.query;
  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "Query parameter is required" });
  }

  // Setup SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent("start", { topic: query.trim() });

    // Create DB record if Mongo is connected
    let researchDoc = null;
    if (isDbConnected) {
      try {
        researchDoc = await Research.create({
          topic: query.trim(),
          status: "in_progress",
        });
      } catch (e) {
        console.warn("Could not create initial DB record:", e.message);
      }
    }

    const state = await runPipeline(query, (progress) => {
      sendEvent("progress", progress);
    });

    // Update DB with results
    if (researchDoc) {
      researchDoc.status = "completed";
      researchDoc.searchResults = state.searchResults;
      researchDoc.scrapedArticles = state.scrapedArticles;
      researchDoc.draftReport = state.draftReport;
      researchDoc.criticFeedback = state.criticFeedback;
      researchDoc.finalReport = state.finalReport;
      researchDoc.durationMs = state.durationMs;
      await researchDoc.save();
    }

    sendEvent("complete", {
      id: researchDoc?._id || null,
      topic: state.topic,
      finalReport: state.finalReport,
      draftReport: state.draftReport,
      criticFeedback: state.criticFeedback,
      searchResults: state.searchResults,
      scrapedArticles: state.scrapedArticles,
      durationMs: state.durationMs,
    });

    res.end();
  } catch (error) {
    sendEvent("error", { message: error.message });
    res.end();
  }
});

// Standard POST endpoint for research
app.post("/api/research", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ error: "Query is required" });
    }

    console.log(`[API POST /api/research] Starting research on "${query}"`);

    let researchDoc = null;
    if (isDbConnected) {
      try {
        researchDoc = await Research.create({
          topic: query.trim(),
          status: "in_progress",
        });
      } catch (err) {
        console.warn("Failed creating mongo document:", err.message);
      }
    }

    const state = await runPipeline(query);

    if (researchDoc) {
      researchDoc.status = "completed";
      researchDoc.searchResults = state.searchResults;
      researchDoc.scrapedArticles = state.scrapedArticles;
      researchDoc.draftReport = state.draftReport;
      researchDoc.criticFeedback = state.criticFeedback;
      researchDoc.finalReport = state.finalReport;
      researchDoc.durationMs = state.durationMs;
      await researchDoc.save();
    }

    res.json({
      success: true,
      data: {
        id: researchDoc?._id || null,
        topic: state.topic,
        finalReport: state.finalReport,
        draftReport: state.draftReport,
        criticFeedback: state.criticFeedback,
        searchResults: state.searchResults,
        scrapedArticles: state.scrapedArticles,
        durationMs: state.durationMs,
      },
    });
  } catch (error) {
    console.error("Research route error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to execute research pipeline",
    });
  }
});

// Fetch research history
app.get("/api/research", async (req, res) => {
  try {
    if (!isDbConnected) {
      return res.json({ success: true, count: 0, data: [] });
    }
    const history = await Research.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select("topic status createdAt durationMs searchResults.length finalReport");

    res.json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch single research detail
app.get("/api/research/:id", async (req, res) => {
  try {
    if (!isDbConnected) {
      return res.status(404).json({ error: "Database not connected" });
    }
    const report = await Research.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a research report
app.delete("/api/research/:id", async (req, res) => {
  try {
    if (!isDbConnected) {
      return res.status(400).json({ error: "Database not connected" });
    }
    await Research.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Research report deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Direct test tool endpoints
app.post("/api/tools/search", async (req, res) => {
  try {
    const { query } = req.body;
    const results = await searchNews(query || "AI developments");
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/tools/scrape", async (req, res) => {
  try {
    const { url } = req.body;
    const scraped = await scrapeWebpage(url);
    res.json({ success: true, scraped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(` Multi-Agent Research Backend running at http://localhost:${PORT}`);
});