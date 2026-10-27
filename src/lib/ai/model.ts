// Model routing for the AI coach. Any OpenAI-compatible endpoint works.
// Defaults to the official OpenAI API; override with AI_BASE_URL + AI_API_KEY + AI_MODEL
// to point at DeepSeek, Groq, Gemini, OpenRouter, etc. (presets commented in .env).
export function resolveModelConfig() {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || ""
  const baseURL = process.env.AI_BASE_URL || undefined
  const modelId = process.env.AI_MODEL || "gpt-4o-mini"
  return { apiKey, baseURL, modelId }
}
