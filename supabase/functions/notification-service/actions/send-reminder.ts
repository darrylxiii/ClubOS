/**
 * Reminder notification action handler
 * Handles various reminder types with scheduling
 */

import type { NotificationContext, ActionResult } from "../index.ts";
import { sendEmailAction } from "./send-email.ts";
import { sendSmsAction } from "./send-sms.ts";
import { sendPushAction } from "./send-push.ts";

interface ReminderPayload {
  user_id: string;
  type: "booking" | "scorecard" | "follow-up" | "task" | "general";
  title: string;
  message: string;
  channels: ("email" | "sms" | "push")[];
  email?: string;
  phone?: string;
  scheduled_for?: string;
  entity_type?: string;
  entity_id?: string;
  data?: Record<string, unknown>;
}

export async function sendReminderAction(ctx: NotificationContext): Promise<ActionResult> {
  const payload = ctx.payload as unknown as ReminderPayload;
  
  if (!payload.user_id || !payload.title || !payload.message) {
    return { success: false, error: "Missing required fields" };
  }

  // If scheduled for future, store and return
  if (payload.scheduled_for) {
    const scheduledTime = new Date(payload.scheduled_for);
    if (scheduledTime > new Date()) {
      return await scheduleReminder(ctx, payload);
    }
  }

  const results: Record<string, ActionResult> = {};
  const channels = payload.channels || ["push"];

  // Send via each requested channel
  for (const channel of channels) {
    switch (channel) {
      case "email":
        if (payload.email) {
          results.email = await sendEmailAction({
            ...ctx,
            payload: {
              to: payload.email,
              subject: payload.title,
              html: buildReminderEmailHtml(payload),
              type: "general",
            },
          });
        }
        break;

      case "sms":
        if (payload.phone) {
          results.sms = await sendSmsAction({
            ...ctx,
            payload: {
              to: payload.phone,
              message: `${payload.title}: ${payload.message}`,
              type: "general",
            },
          });
        }
        break;

      case "push":
        results.push = await sendPushAction({
          ...ctx,
          payload: {
            user_id: payload.user_id,
            title: payload.title,
            body: payload.message,
            type: "reminder",
            data: {
              entity_type: payload.entity_type || "",
              entity_id: payload.entity_id || "",
            },
          },
        });
        break;
    }
  }

  // Log reminder
  await ctx.supabase.from("reminder_log").insert({
    user_id: payload.user_id,
    reminder_type: payload.type,
    title: payload.title,
    message: payload.message,
    channels: channels,
    results: results,
    entity_type: payload.entity_type,
    entity_id: payload.entity_id,
  }).catch(() => { /* Ignore logging errors */ });

  const allSucceeded = Object.values(results).every(r => r.success);
  const anySucceeded = Object.values(results).some(r => r.success);

  return {
    success: anySucceeded,
    data: { 
      channels: results,
      message: allSucceeded ? "All channels succeeded" : "Some channels failed"
    },
    error: allSucceeded ? undefined : "Some notification channels failed",
  };
}

async function scheduleReminder(
  ctx: NotificationContext, 
  payload: ReminderPayload
): Promise<ActionResult> {
  try {
    const { error } = await ctx.supabase.from("scheduled_reminders").insert({
      user_id: payload.user_id,
      scheduled_for: payload.scheduled_for,
      reminder_type: payload.type,
      title: payload.title,
      message: payload.message,
      channels: payload.channels,
      email: payload.email,
      phone: payload.phone,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      data: payload.data,
      status: "pending",
    });

    if (error) throw error;

    return { 
      success: true, 
      data: { 
        scheduled: true, 
        scheduled_for: payload.scheduled_for 
      } 
    };
  } catch (error) {
    console.error("[send-reminder] Failed to schedule:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to schedule reminder" 
    };
  }
}

function buildReminderEmailHtml(payload: ReminderPayload): string {
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #C9A24E;">${payload.title}</h1>
      <p style="font-size: 16px; color: #333;">${payload.message}</p>
      ${payload.entity_type && payload.entity_id ? `
        <p style="margin-top: 20px;">
          <a href="https://app.thequantumclub.nl/${payload.entity_type}/${payload.entity_id}" 
             style="display: inline-block; background: #C9A24E; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            View Details
          </a>
        </p>
      ` : ""}
      <p style="color: #666; font-size: 14px; margin-top: 30px;">The Quantum Club</p>
    </div>
  `;
}
