import { getAuthContext, json, methodNotAllowed } from "./_shared.mjs";

export async function handler(event) {
  if (event.httpMethod !== "GET") return methodNotAllowed();

  const auth = await getAuthContext(event);
  if (auth.error) return auth.error;

  const { supabase, user } = auth;
  const id = event.queryStringParameters?.id;

  if (!id) {
    return json(400, { success: false, error: "Conversation ID is required." });
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id,title,file_name,document_text,created_at,updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (conversationError || !conversation) {
    return json(404, { success: false, error: "Conversation not found." });
  }

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id,role,content,created_at")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.error("Load messages error:", messagesError);
    return json(500, { success: false, error: "Failed to load conversation messages." });
  }

  return json(200, {
    success: true,
    conversation,
    messages: messages || []
  });
}

