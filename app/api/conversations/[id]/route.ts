import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Conversation ID is required." },
        { status: 400 }
      );
    }

    const { data: conversation, error: conversationError } =
      await supabase
        .from("conversations")
        .select(
          "id, title, file_name, document_text, created_at, updated_at"
        )
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

    if (conversationError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 }
      );
    }

    const { data: messages, error: messagesError } =
      await supabase
        .from("messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Messages fetch error:", messagesError);

      return NextResponse.json(
        { error: "Failed to load messages." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversation,
      messages: messages || [],
    });
  } catch (error) {
    console.error("Conversation GET API error:", error);

    return NextResponse.json(
      { error: "Failed to load conversation." },
      { status: 500 }
    );
  }
}
