import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("conversations")
      .select(
        "id, title, file_name, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Conversation fetch error:", error);

      return NextResponse.json(
        { error: "Failed to load conversations." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversations: data || [],
    });
  } catch (error) {
    console.error("Conversation GET API error:", error);

    return NextResponse.json(
      { error: "Failed to load conversations." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : "New Conversation";

    const fileName =
      typeof body.fileName === "string" ? body.fileName : null;

    const documentText =
      typeof body.documentText === "string" ? body.documentText : null;

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title,
        file_name: fileName,
        document_text: documentText,
      })
      .select()
      .single();

    if (error) {
      console.error("Conversation insert error:", error);

      return NextResponse.json(
        { error: "Failed to save conversation." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation: data,
    });
  } catch (error) {
    console.error("Conversation API error:", error);

    return NextResponse.json(
      { error: "Failed to create conversation." },
      { status: 500 }
    );
  }
}
