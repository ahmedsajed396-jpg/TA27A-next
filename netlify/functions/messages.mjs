import { getAuthContext, json, methodNotAllowed } from "./_shared.mjs";

export async function handler(event) {
  if (event.httpMethod !== "POST") return methodNotAllowed();

  const auth = await getAuthContext(event);
  if (auth.error) return auth.error;

  try {
    const { supabase, user } = auth;
    const body = JSON.parse(event.body || "{}");

    const conversationId = body.conversationId;
    const role = body.role;
    const content = body.content;

    if (!conversationId || !["user", "assistant"].includes(role) ||
        typeof content !== "string" || !content.trim()) {
      return json(400, { success: false, error: "Invalid message data." });
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role,
        content
      })
      .select()
      .single();

    if (error) {
      console.error("Save message error:", error);
      return json(500, { success: false, error: "Failed to save message." });
    }

    const { error: updateError } = await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Update conversation timestamp error:", updateError);
    }

    return json(201, { success: true, message: data });
  } catch (error) {
    return json(400, { success: false, error: "Invalid request body." });
  }
}

