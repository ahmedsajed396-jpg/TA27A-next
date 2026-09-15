import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

    const conversationId =
      typeof body.conversationId === "string"
        ? body.conversationId
        : "";

    const role = body.role;

    const content =
      typeof body.content === "string"
        ? body.content.trim()
        : "";

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required." },
        { status: 400 }
      );
    }

    if (role !== "user" && role !== "assistant") {
      return NextResponse.json(
        { error: "Invalid message role." },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: "Message content is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error("Message insert error:", error);

      return NextResponse.json(
        { error: "Failed to save message." },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error(
        "Conversation update error:",
        updateError
      );
    }

    return NextResponse.json({
      success: true,
      message: data,
    });
  } catch (error) {
    console.error("Message API error:", error);

    return NextResponse.json(
      { error: "Failed to save message." },
      { status: 500 }
    );
  }
}
