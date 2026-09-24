import mongoose from "mongoose";

const SourceSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Web Source" },
    url: { type: String, required: true },
    content: { type: String, default: "" },
    score: { type: Number, default: 0 },
  },
  { _id: false }
);

const ScrapedArticleSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Article" },
    url: { type: String, required: true },
    content: { type: String, default: "" },
    length: { type: Number, default: 0 },
  },
  { _id: false }
);

const ResearchSchema = new mongoose.Schema(
  {
    topic: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "failed"],
      default: "pending",
    },
    searchResults: [SourceSchema],
    scrapedArticles: [ScrapedArticleSchema],
    draftReport: {
      type: String,
      default: "",
    },
    criticFeedback: {
      type: String,
      default: "",
    },
    finalReport: {
      type: String,
      default: "",
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Research = mongoose.model("Research", ResearchSchema);
export default Research;
