import "dotenv/config";
import { HfInference } from "@huggingface/inference";

// Initialize Hugging Face client with your API token
const hf = new HfInference(process.env.HUGGINGFACEHUB_API_TOKEN);

/**
 * Simple helper to ask Hugging Face AI (Qwen-72B) a question
 * @param {string} systemMessage - Instructions for the AI (its role)
 * @param {string} userMessage - The actual topic or prompt
 * @returns {Promise<string>} The AI's text response
 */
export async function askAI(systemMessage, userMessage) {
  try {
    const response = await hf.chatCompletion({
      model: "Qwen/Qwen2.5-72B-Instruct",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      max_tokens: 2048,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("AI Error:", error.message);
    throw new Error(`AI generation failed: ${error.message}`);
  }
}

export default askAI;
