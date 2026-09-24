import React, { useState, useEffect } from "react";
import {
  Search,
  Globe,
  FileText,
  CheckCircle,
  Copy,
  Check,
  Download,
  History,
  Sparkles,
  RefreshCw,
  Layers,
  ExternalLink,
} from "lucide-react";
import "./App.css";

// 5 Pipeline Stages
const STAGES = [
  { id: "search", name: "1. Search (Tavily)", icon: Globe },
  { id: "scrape", name: "2. Scrape (Cheerio)", icon: FileText },
  { id: "write", name: "3. Write Draft", icon: FileText },
  { id: "critique", name: "4. Critic Review", icon: Layers },
  { id: "refine", name: "5. Final Polish", icon: Sparkles },
];

export default function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("report");
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);

  // Check backend health & fetch history on page load
  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((d) => setDbConnected(d.database === "connected"))
      .catch(() => setDbConnected(false));

    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/research");
      const result = await res.json();
      if (result.success && result.data) {
        setHistory(result.data);
      }
    } catch (e) {
      console.warn("Could not load history:", e);
    }
  };

  // Start autonomous research pipeline
  const startResearch = (searchTopic) => {
    const topic = (searchTopic || query).trim();
    if (!topic || loading) return;

    setLoading(true);
    setData(null);
    setCurrentStep("search");
    setStatusMessage(`Searching web for "${topic}"...`);

    // Connect to Server-Sent Events (SSE) stream
    const sse = new EventSource(`/api/research/stream?query=${encodeURIComponent(topic)}`);

    sse.addEventListener("progress", (e) => {
      const update = JSON.parse(e.data);
      setCurrentStep(update.step);
      setStatusMessage(update.message);
    });

    sse.addEventListener("complete", (e) => {
      const result = JSON.parse(e.data);
      setData(result);
      setCurrentStep("complete");
      setLoading(false);
      loadHistory(); // refresh history from MongoDB Atlas
      sse.close();
    });

    sse.addEventListener("error", () => {
      setLoading(false);
      sse.close();
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(data?.finalReport || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadReport = () => {
    const blob = new Blob([data?.finalReport || ""], { type: "text/markdown" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${(data?.topic || "research").replace(/\s+/g, "_")}.md`;
    link.click();
  };

  return (
    <div className="app-container">
      {/* 1. Header */}
      <header className="header">
        <div className="logo-section">
          <Sparkles className="logo-icon" />
          <h1>DeepResearch AI</h1>
          <span className="badge">MERN Research Engine</span>
        </div>
        <div className="db-badge">
          <span className={`status-dot ${dbConnected ? "online" : "offline"}`} />
          <span>{dbConnected ? "MongoDB Atlas Online" : "MongoDB Offline"}</span>
        </div>
      </header>

      {/* 2. Search Section */}
      <section className="search-section">
        <h2>Autonomous Multi-Agent Deep Research</h2>
        <p>Powered by Tavily Web Search, Cheerio Page Scraper, and Hugging Face Qwen AI</p>

        <div className="search-box">
          <Search className="search-icon" />
          <input
            type="text"
            value={query}
            disabled={loading}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startResearch()}
            placeholder="Enter research topic (e.g. Quantum Computing, AI Agents in 2026)..."
          />
          <button onClick={() => startResearch()} disabled={loading || !query.trim()}>
            {loading ? <RefreshCw className="spin" /> : "Research"}
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="chips">
          <span>Try:</span>
          {["AI Agents in 2026", "Quantum Computing", "CRISPR Therapy", "Solid-State Batteries"].map((item) => (
            <button key={item} onClick={() => { setQuery(item); startResearch(item); }}>
              {item}
            </button>
          ))}
        </div>
      </section>

      {/* 3. 5-Step Pipeline Stepper */}
      {(loading || data) && (
        <section className="stepper-section">
          <div className="stepper">
            {STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              const isCurrent = currentStep === stage.id && loading;
              const isDone = currentStep === "complete" || STAGES.findIndex((s) => s.id === currentStep) > idx;

              return (
                <div key={stage.id} className={`step-card ${isCurrent ? "active" : ""} ${isDone ? "done" : ""}`}>
                  <Icon className="step-icon" />
                  <span className="step-title">{stage.name}</span>
                  {isCurrent && <span className="step-status">In progress...</span>}
                  {isDone && <span className="step-status done-text"><CheckCircle size={12} /> Done</span>}
                </div>
              );
            })}
          </div>
          {loading && <p className="status-message">{statusMessage}</p>}
        </section>
      )}

      {/* 4. Results Section */}
      {data && (
        <section className="results-section">
          <div className="results-header">
            <div>
              <h3>{data.topic}</h3>
              <small>{(data.durationMs / 1000).toFixed(1)}s elapsed • {data.searchResults?.length || 0} Sources • Saved in Atlas</small>
            </div>
            <div className="actions">
              <button onClick={copyToClipboard}>
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
              </button>
              <button onClick={downloadReport}>
                <Download size={14} /> Download .md
              </button>
            </div>
          </div>

          {/* Result Tabs */}
          <div className="tabs">
            <button className={activeTab === "report" ? "tab-active" : ""} onClick={() => setActiveTab("report")}>
              Final Report
            </button>
            <button className={activeTab === "critique" ? "tab-active" : ""} onClick={() => setActiveTab("critique")}>
              Critic Review
            </button>
            <button className={activeTab === "sources" ? "tab-active" : ""} onClick={() => setActiveTab("sources")}>
              Sources ({data.searchResults?.length || 0})
            </button>
            <button className={activeTab === "draft" ? "tab-active" : ""} onClick={() => setActiveTab("draft")}>
              First Draft
            </button>
          </div>

          <div className="tab-content">
            {activeTab === "report" && <pre className="report-text">{data.finalReport}</pre>}
            {activeTab === "critique" && <pre className="report-text">{data.criticFeedback}</pre>}
            {activeTab === "draft" && <pre className="report-text">{data.draftReport}</pre>}
            {activeTab === "sources" && (
              <div className="sources-list">
                {(data.searchResults || []).map((source, i) => (
                  <a key={i} href={source.url} target="_blank" rel="noreferrer" className="source-item">
                    <strong>{source.title} <ExternalLink size={12} /></strong>
                    <p>{source.content}</p>
                    <small>{source.url}</small>
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5. Saved History Section (MongoDB Atlas) */}
      {history.length > 0 && (
        <section className="history-section">
          <h4><History size={16} /> Saved Reports in MongoDB Atlas ({history.length})</h4>
          <div className="history-list">
            {history.map((item) => (
              <button
                key={item._id}
                className="history-chip"
                onClick={() => {
                  fetch(`/api/research/${item._id}`)
                    .then((r) => r.json())
                    .then((res) => res.data && setData(res.data));
                }}
              >
                {item.topic}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
