import { NextResponse } from "next/server";
import pdf from "pdf-parse";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json(
                { error: "No PDF file was uploaded." },
                { status: 400 }
            );
        }

        if (file.type !== "application/pdf") {
            return NextResponse.json(
                { error: "Only PDF files are supported." },
                { status: 400 }
            );
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        const result = await pdf(buffer);

        return NextResponse.json({
            success: true,
            fileName: file.name,
            text: result.text || "",
            pages: result.numpages || 0,
        });
    } catch (error) {
        console.error("PDF processing error:", error);

        return NextResponse.json(
            { error: "Failed to process the PDF file." },
            { status: 500 }
        );
    }
}