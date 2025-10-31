import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

interface RefreshTokenResult {
  accessToken: string;
  expiresAt: string;
  error?: string;
}

export async function refreshGmailToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<RefreshTokenResult> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gmail token refresh failed:", errorData);
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    return {
      accessToken: data.access_token,
      expiresAt,
    };
  } catch (error: any) {
    console.error("Error refreshing Gmail token:", error);
    return {
      accessToken: "",
      expiresAt: "",
      error: error.message,
    };
  }
}

export async function refreshOutlookToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<RefreshTokenResult> {
  try {
    const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Mail.Send offline_access",
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Outlook token refresh failed:", errorData);
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    return {
      accessToken: data.access_token,
      expiresAt,
    };
  } catch (error: any) {
    console.error("Error refreshing Outlook token:", error);
    return {
      accessToken: "",
      expiresAt: "",
      error: error.message,
    };
  }
}

export async function ensureValidToken(
  connectionId: string,
  provider: string
): Promise<{ accessToken: string; error?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get connection with token info
  const { data: connection, error: connError } = await supabase
    .from("email_connections")
    .select("*")
    .eq("id", connectionId)
    .single();

  if (connError || !connection) {
    return { accessToken: "", error: "Connection not found" };
  }

  // Check if token is expired or about to expire (within 5 minutes)
  const now = new Date();
  const expiresAt = connection.token_expires_at ? new Date(connection.token_expires_at) : null;
  const needsRefresh = !expiresAt || expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;

  if (!needsRefresh) {
    return { accessToken: connection.access_token };
  }

  // Token needs refresh
  console.log(`Refreshing ${provider} token for connection ${connectionId}...`);

  if (!connection.refresh_token) {
    return { accessToken: "", error: "No refresh token available" };
  }

  let result: RefreshTokenResult;

  if (provider === "gmail") {
    const clientId = Deno.env.get("GMAIL_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET")!;
    result = await refreshGmailToken(connection.refresh_token, clientId, clientSecret);
  } else if (provider === "outlook") {
    const clientId = Deno.env.get("MICROSOFT_CLIENT_ID")!;
    const clientSecret = Deno.env.get("MICROSOFT_CLIENT_SECRET")!;
    result = await refreshOutlookToken(connection.refresh_token, clientId, clientSecret);
  } else {
    return { accessToken: "", error: "Unsupported provider" };
  }

  if (result.error) {
    return { accessToken: "", error: result.error };
  }

  // Update connection with new token
  await supabase
    .from("email_connections")
    .update({
      access_token: result.accessToken,
      token_expires_at: result.expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connectionId);

  console.log(`Token refreshed successfully for connection ${connectionId}`);

  return { accessToken: result.accessToken };
}
