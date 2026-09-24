import { askAI } from "./llm.js";

/**
 * 1. Writer Agent
 * Takes the gathered research and writes a comprehensive first draft.
 */
export async function writerAgent(topic, researchText) {
  const systemPrompt = "You are a professional technology and scientific writer. Write an engaging, well-structured research report in markdown.";
  
  const userPrompt = `
Topic: ${topic}

Gathered Research:
${researchText}

Write a complete report with the following markdown structure:
# ${topic}
## Executive Summary
## Key Findings (3-5 bullet points)
## Deep-Dive Analysis
## Conclusion & Outlook
## Sources (list URLs)
`;

  return await askAI(systemPrompt, userPrompt);
}

/**
 * 2. Critic Agent
 * Reviews the draft report and gives 3-4 specific suggestions for improvement.
 */
export async function criticAgent(topic, draftReport) {
  const systemPrompt = "You are a strict senior editor. Review the research draft and provide 3-4 specific, actionable improvements.";
  
  const userPrompt = `
Topic: ${topic}

Draft Report:
${draftReport}

List 3-4 specific improvements focusing on clarity, accuracy, missing information, and depth.
`;

  return await askAI(systemPrompt, userPrompt);
}

/**
 * 3. Refiner Agent
 * Rewrites the report incorporating the critic's feedback.
 */
export async function refinerAgent(topic, draftReport, criticFeedback) {
  const systemPrompt = "You are a master editor producing the final publication-ready report.";

  const userPrompt = `
Topic: ${topic}

Original Draft:
${draftReport}

Editor Feedback:
${criticFeedback}

Rewrite the report to address the feedback. Keep all valid URLs and output clean, polished Markdown:
`;

  return await askAI(systemPrompt, userPrompt);
}

// Backward compatibility aliases
export const writerChain = { invoke: ({ topic, research }) => writerAgent(topic, research) };
export const criticChain = { invoke: ({ topic, report }) => criticAgent(topic, report) };
export const feedbackChain = { invoke: ({ topic, report, feedback }) => refinerAgent(topic, report, feedback) };
