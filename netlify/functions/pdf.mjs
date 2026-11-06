import pdfParse from "pdf-parse";
import { getAuthContext, json, methodNotAllowed } from "./_shared.mjs";

export async function handler(event) {
  if (event.httpMethod !== "POST") return methodNotAllowed();

  const auth = await getAuthContext(event);
  if (auth.error) return auth.error;

  try {
    const headers = new Headers(event.headers || {});
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64")
      : Buffer.from(event.body || "", "binary");

    const request = new Request("http://localhost/upload", {
      method: "POST",
      headers,
      body: rawBody
    });

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      return json(400, { success: false, error: "Please select a PDF file." });
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return json(400, { success: false, error: "Only PDF files are supported." });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await pdfParse(buffer);

    if (!result.text?.trim()) {
      return json(400, { success: false, error: "No readable text was found in this PDF." });
    }

    return json(200, {
      success: true,
      fileName: file.name,
      text: result.text,
      pages: result.numpages
    });
  } catch (error) {
    console.error("PDF processing error:", error);
    return json(500, { success: false, error: "Failed to process the PDF file." });
  }
}

