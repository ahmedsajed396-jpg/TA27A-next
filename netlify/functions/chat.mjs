import { GoogleGenAI } from "@google/genai";
import { getAuthContext, json, methodNotAllowed } from "./_shared.mjs";

export async function handler(event) {
  if (event.httpMethod !== "POST") return methodNotAllowed();

  const auth = await getAuthContext(event);
  if (auth.error) return auth.error;

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return json(500, { success: false, error: "Gemini API key is not configured." });
    }

    const body = JSON.parse(event.body || "{}");
    const prompt = body.prompt;
    const documentText = body.documentText;
    const instructions = body.instructions || "";

    if (typeof prompt !== "string" || !prompt.trim()) {
      return json(400, { success: false, error: "Please enter a question." });
    }

    if (typeof documentText !== "string" || !documentText.trim()) {
      return json(400, { success: false, error: "Document text is missing." });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `
You are TA27A, an AI document intelligence assistant.

Answer the user's question using the supplied document.
Do not invent facts. If the answer is not available in the document, say so clearly.
Be accurate, clear, and helpful.

Additional instructions:
${instructions}

Document:
${documentText}

User question:
${prompt}
`
    });

    const answer = response.text;

    if (!answer) {
      return json(502, { success: false, error: "The AI service returned an empty response." });
    }

    return json(200, { success: true, text: answer });
  } catch (error) {
    console.error("Gemini request error:", error);
    return json(500, { success: false, error: "Failed to generate AI response." });
  }
}

