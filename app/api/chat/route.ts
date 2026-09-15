import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const prompt = body.prompt;
    const documentText = body.documentText;
    const instructions = body.instructions;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required." },
        { status: 400 }
      );
    }

    if (!documentText || typeof documentText !== "string") {
      return NextResponse.json(
        { error: "Document text is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    const customInstructions =
      typeof instructions === "string" && instructions.trim()
        ? instructions.trim()
        : "Answer clearly, accurately, and concisely.";

    const fullPrompt = `
You are TA27A, an AI document intelligence assistant.

Your job is to answer the user's question using the document provided below.

Custom AI Instructions:
---
${customInstructions}
---

Document:
---
${documentText}
---

User question:
${prompt}

Important rules:
- Answer based on the document.
- Follow the Custom AI Instructions when they do not conflict with the document.
- If the answer is not found in the document, clearly say that it is not available in the document.
- Do not invent information.
- Be clear and accurate.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: fullPrompt,
    });

    return NextResponse.json({
      success: true,
      text: response.text || "",
    });
  } catch (error) {
    console.error("Gemini API error:", error);

    return NextResponse.json(
      { error: "Failed to generate AI response." },
      { status: 500 }
    );
  }
}