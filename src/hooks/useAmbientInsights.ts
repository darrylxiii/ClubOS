import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";

export interface AmbientInsight {
  id: string;
  type: "stale_application" | "uncontacted_lead" | "pipeline_bottleneck" | "upcoming_deadline" | "missing_followup";
  priority: number; // 1 = highest
  message: string;
  actionLabel: string;
  actionPath: string;
  icon: "alert" | "clock" | "users" | "target" | "calendar";
  dismissKey: string;
}

const DISMISS_PREFIX = "qc-ambient-dismiss-";

function isDismissed(key: string): boolean {
  try {
    const val = localStorage.getItem(`${DISMISS_PREFIX}${key}`);
    if (!val) return false;
    // Dismissals expire after 24h
    return Date.now() - parseInt(val, 10) < 24 * 60 * 60 * 1000;
  } catch { return false; }
}

function dismissInsight(key: string) {
  localStorage.setItem(`${DISMISS_PREFIX}${key}`, Date.now().toString());
}

export function useAmbientInsights() {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const [insights, setInsights] = useState<AmbientInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInsights = useCallback(async () => {
    if (!user) {
      setInsights([]);
      setLoading(false);
      return;
    }

    const detected: AmbientInsight[] = [];
    const today = new Date();

    try {
      // ── Admin / Strategist insights ──
      if (currentRole === "admin" || currentRole === "strategist") {
        // Stale applications in screening (7+ days)
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: staleApps, count: staleCount } = await supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("status", "screening")
          .lt("updated_at", sevenDaysAgo);

        if (staleCount && staleCount > 0) {
          const key = `stale-apps-${today.toDateString()}`;
          if (!isDismissed(key)) {
            detected.push({
              id: "stale-applications",
              type: "stale_application",
              priority: 1,
              message: `${staleCount} application${staleCount > 1 ? "s" : ""} stuck in screening for 7+ days.`,
              actionLabel: "Review pipeline",
              actionPath: "/admin/pipeline",
              icon: "alert",
              dismissKey: key,
            });
          }
        }

        // Upcoming job deadlines (within 3 days)
        const threeDaysOut = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
        const { data: closingJobs, count: closingCount } = await supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .lte("application_deadline", threeDaysOut)
          .gte("application_deadline", today.toISOString());

        if (closingCount && closingCount > 0) {
          const key = `closing-jobs-${today.toDateString()}`;
          if (!isDismissed(key)) {
            detected.push({
              id: "upcoming-deadlines",
              type: "upcoming_deadline",
              priority: 2,
              message: `${closingCount} job${closingCount > 1 ? "s" : ""} closing within 3 days.`,
              actionLabel: "View jobs",
              actionPath: "/jobs",
              icon: "calendar",
              dismissKey: key,
            });
          }
        }
      }

      // ── Partner insights ──
      if (currentRole === "partner" || currentRole === "admin" || currentRole === "strategist") {
        // CRM prospects with no touchpoints in 14+ days
        const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const { data: coldProspects, count: coldCount } = await supabase
          .from("crm_prospects")
          .select("id", { count: "exact", head: true })
          .lt("last_contact_date", fourteenDaysAgo)
          .neq("status", "lost")
          .neq("status", "won");

        if (coldCount && coldCount > 0) {
          const key = `cold-prospects-${today.toDateString()}`;
          if (!isDismissed(key)) {
            detected.push({
              id: "uncontacted-leads",
              type: "uncontacted_lead",
              priority: 2,
              message: `${coldCount} prospect${coldCount > 1 ? "s" : ""} haven't been contacted in 14+ days.`,
              actionLabel: "Open CRM",
              actionPath: "/crm",
              icon: "users",
              dismissKey: key,
            });
          }
        }
      }

      // ── Candidate insights ──
      if (currentRole === "user") {
        // Missing meeting follow-ups (meeting happened 48h+ ago, no notes)
        const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recentMeetings, count: meetingCount } = await supabase
          .from("meetings")
          .select("id", { count: "exact", head: true })
          .eq("host_id", user.id)
          .eq("status", "completed")
          .lt("actual_end", twoDaysAgo)
          .is("ai_summary", null);

        if (meetingCount && meetingCount > 0) {
          const key = `meeting-followup-${today.toDateString()}`;
          if (!isDismissed(key)) {
            detected.push({
              id: "missing-followups",
              type: "missing_followup",
              priority: 1,
              message: `${meetingCount} completed meeting${meetingCount > 1 ? "s" : ""} need follow-up notes.`,
              actionLabel: "View meetings",
              actionPath: "/meetings",
              icon: "clock",
              dismissKey: key,
            });
          }
        }
      }

      // Sort by priority
      detected.sort((a, b) => a.priority - b.priority);
      setInsights(detected);
    } catch (err) {
      console.error("Ambient insights error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, currentRole]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  const dismiss = useCallback((insight: AmbientInsight) => {
    dismissInsight(insight.dismissKey);
    setInsights((prev) => prev.filter((i) => i.id !== insight.id));
  }, []);

  return { insights, loading, dismiss, refresh: loadInsights };
}