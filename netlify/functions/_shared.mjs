import { createClient } from "@supabase/supabase-js";

export function json(statusCode, data) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(data)
  };
}

export function getSupabaseSettings() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  };
}

export async function getAuthContext(event) {
  const { url, key } = getSupabaseSettings();

  if (!url || !key) {
    return { error: json(500, { success: false, error: "Supabase environment variables are missing." }) };
  }

  const authorization = event.headers?.authorization || event.headers?.Authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!token) {
    return { error: json(401, { success: false, error: "Authentication required." }) };
  }

  const supabase = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  });

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return { error: json(401, { success: false, error: "Invalid or expired session." }) };
  }

  return {
    supabase,
    user: data.user
  };
}

export function methodNotAllowed() {
  return json(405, { success: false, error: "Method not allowed." });
}
