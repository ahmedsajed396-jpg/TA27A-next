import { GoogleGenAI } from "@google/genai";
import { getAuthContext, json, methodNotAllowed } from "./_shared.mjs";

const MODEL = "gemini-3.6-flash";

const AGENTS = {
  document: {
    name: "Document Agent",
    instruction: `
You are the Document Agent in the TA27A multi-agent system.
Read the supplied document carefully.
Extract only information relevant to the user's question.
Preserve important facts, names, dates, numbers, quotations, and page references when available.
Do not invent information.
Return organized evidence that the next agent can analyze.
`
  },

  analysis: {
    name: "Analysis Agent",
    instruction: `
You are the Analysis Agent in the TA27A multi-agent system.
Analyze the evidence extracted by the Document Agent.
Identify key findings, relationships, patterns, implications, and relevant details.
Distinguish explicit facts from reasonable interpretations.
Do not add facts that are not supported by the supplied evidence.
`
  },

  verification: {
    name: "Verification Agent",
    instruction: `
You are the Verification Agent in the TA27A multi-agent system.
Review the analysis against the original document and extracted evidence.
Identify unsupported claims, inaccurate numbers, contradictions, and missing context.
Correct or reject claims that cannot be supported by the document.
Return a verified set of findings and clearly mention any uncertainty.
`
  },

  answer: {
    name: "Answer Agent",
    instruction: `
You are the Answer Agent in the TA27A multi-agent system.
Write the final response to the user's question using the verified findings.
Be clear, accurate, organized, and helpful.
Answer in the same language as the user's question.
Do not include internal agent discussions.
If the document does not contain the answer, say so clearly.
`
  }
};

async function generate(ai, contents) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents
  });

  const text = response.text;

  if (!text || !text.trim()) {
    throw new Error("The AI service returned an empty response.");
  }

  return text.trim();
}

export async function handler(event) {
  if (event.httpMethod !== "POST") return methodNotAllowed();

  const auth = await getAuthContext(event);
  if (auth.error) return auth.error;

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return json(500, {
        success: false,
        error: "Gemini API key is not configured."
      });
    }

    const body = JSON.parse(event.body || "{}");
    const {
      stage,
      prompt,
      documentText,
      instructions = "",
      context = {}
    } = body;

    if (typeof prompt !== "string" || !prompt.trim()) {
      return json(400, {
        success: false,
        error: "Please enter a question."
      });
    }

    if (typeof documentText !== "string" || !documentText.trim()) {
      return json(400, {
        success: false,
        error: "Document text is missing."
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Backward compatibility with the existing frontend.
    if (!stage) {
      const answer = await generate(ai, `
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
`);

      return json(200, {
        success: true,
        text: answer
      });
    }

    const agent = AGENTS[stage];

    if (!agent) {
      return json(400, {
        success: false,
        error: "Unknown agent stage."
      });
    }

    let contents = "";

    if (stage === "document") {
      contents = `
${agent.instruction}

User question:
${prompt}

Original document:
${documentText}

Additional instructions:
${instructions}
`;
    }

    if (stage === "analysis") {
      if (typeof context.evidence !== "string" || !context.evidence.trim()) {
        return json(400, {
          success: false,
          error: "Document Agent results are missing."
        });
      }

      contents = `
${agent.instruction}

User question:
${prompt}

Document Agent evidence:
${context.evidence}
`;
    }

    if (stage === "verification") {
      if (
        typeof context.evidence !== "string" ||
        typeof context.analysis !== "string"
      ) {
        return json(400, {
          success: false,
          error: "Previous agent results are missing."
        });
      }

      contents = `
${agent.instruction}

User question:
${prompt}

Original document:
${documentText}

Document Agent evidence:
${context.evidence}

Analysis Agent findings:
${context.analysis}
`;
    }

    if (stage === "answer") {
      if (typeof context.verification !== "string" || !context.verification.trim()) {
        return json(400, {
          success: false,
          error: "Verification Agent results are missing."
        });
      }

      contents = `
${agent.instruction}

User question:
${prompt}

Verified findings:
${context.verification}

Additional instructions:
${instructions}
`;
    }

    const result = await generate(ai, contents);

    return json(200, {
      success: true,
      stage,
      agent: agent.name,
      text: result
    });

  } catch (error) {
    console.error("TA27A agent error:", error);

    return json(500, {
      success: false,
      error: "An agent failed to complete its task. Please try again."
    });
  }
}