import { getAuthContext, json, methodNotAllowed } from "./_shared.mjs";

export async function handler(event) {
  const auth = await getAuthContext(event);
  if (auth.error) return auth.error;

  const { supabase, user } = auth;

  if (event.httpMethod === "GET") {
    const { data, error } = await supabase
      .from("conversations")
      .select("id,title,file_name,created_at,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Load conversations error:", error);
      return json(500, { success: false, error: "Failed to load conversations." });
    }

    return json(200, { success: true, conversations: data || [] });
  }

  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");

      const title = typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : "New Conversation";

      const fileName = typeof body.fileName === "string" ? body.fileName : null;
      const documentText = typeof body.documentText === "string" ? body.documentText : null;

      if (!documentText) {
        return json(400, { success: false, error: "Document text is required." });
      }

      const { data, error } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          title,
          file_name: fileName,
          document_text: documentText
        })
        .select()
        .single();

      if (error) {
        console.error("Create conversation error:", error);
        return json(500, { success: false, error: "Failed to create conversation." });
      }

      return json(201, { success: true, conversation: data });
    } catch (error) {
      return json(400, { success: false, error: "Invalid request body." });
    }
  }

  return methodNotAllowed();
}

