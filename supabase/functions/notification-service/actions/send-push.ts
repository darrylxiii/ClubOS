/**
 * Push notification action handler
 * Uses Firebase Cloud Messaging or native push
 */

import type { NotificationContext, ActionResult } from "../index.ts";

interface PushPayload {
  user_id?: string;
  device_tokens?: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  type?: "approval" | "security-alert" | "reminder" | "general";
  priority?: "high" | "normal";
}

export async function sendPushAction(ctx: NotificationContext): Promise<ActionResult> {
  const payload = ctx.payload as unknown as PushPayload;
  
  if (!payload.title || !payload.body) {
    return { success: false, error: "Missing 'title' or 'body' field" };
  }

  // Get device tokens
  let deviceTokens = payload.device_tokens || [];
  
  if (payload.user_id && deviceTokens.length === 0) {
    // Fetch device tokens for user
    const { data: devices } = await ctx.supabase
      .from("user_devices")
      .select("push_token")
      .eq("user_id", payload.user_id)
      .eq("push_enabled", true);
    
    deviceTokens = devices?.map(d => d.push_token).filter(Boolean) || [];
  }

  if (deviceTokens.length === 0) {
    console.log("[send-push] No device tokens found");
    return { success: true, data: { sent: 0, message: "No devices to notify" } };
  }

  const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");
  if (!fcmServerKey) {
    // Store notification in database for later delivery
    await storeInAppNotification(ctx, payload);
    return { success: true, data: { stored: true, message: "Stored as in-app notification" } };
  }

  try {
    // Send via FCM
    const results = await Promise.all(
      deviceTokens.map(token => sendToFCM(fcmServerKey, token, payload))
    );

    const successCount = results.filter(r => r.success).length;
    console.log(`[send-push] Sent ${successCount}/${deviceTokens.length} notifications`);

    // Also store as in-app notification
    await storeInAppNotification(ctx, payload);

    return { 
      success: true, 
      data: { 
        sent: successCount, 
        total: deviceTokens.length,
        failed: deviceTokens.length - successCount
      } 
    };

  } catch (error) {
    console.error("[send-push] Error:", error);
    // Still store as in-app notification on failure
    await storeInAppNotification(ctx, payload);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send push" 
    };
  }
}

async function sendToFCM(
  serverKey: string, 
  token: string, 
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Authorization": `key=${serverKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        priority: payload.priority || "high",
      }),
    });

    if (!response.ok) {
      return { success: false, error: `FCM error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "FCM send failed" 
    };
  }
}

async function storeInAppNotification(
  ctx: NotificationContext, 
  payload: PushPayload
): Promise<void> {
  try {
    await ctx.supabase.from("notifications").insert({
      user_id: payload.user_id || ctx.userId,
      title: payload.title,
      message: payload.body,
      type: payload.type || "general",
      data: payload.data,
      read: false,
    });
  } catch (error) {
    console.error("[send-push] Failed to store in-app notification:", error);
  }
}
