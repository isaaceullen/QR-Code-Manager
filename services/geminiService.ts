import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini API client
// Note: We use NEXT_PUBLIC_GEMINI_API_KEY for client-side usage,
// but the prompt requested process.env.GEMINI_API_KEY.
// For Next.js client components, it must be NEXT_PUBLIC_
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateAIContent = async (prompt: string) => {
  if (!ai) {
    throw new Error("Gemini API key is missing");
  }
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating AI content:", error);
    throw error;
  }
};
