import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface AmbientInsight {
  id: string;
  type: "stale_application" | "uncontacted_lead" | "pipeline_bottleneck" | "upcoming_deadline" | "missing_followup";
  priority: number;
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
    return Date.now() - parseInt(val, 10) < 24 * 60 * 60 * 1000;
  } catch { return false; }
}

function dismissInsight(key: string) {
  localStorage.setItem(`${DISMISS_PREFIX}${key}`, Date.now().toString());
}

async function fetchInsights(userId: string, currentRole: string): Promise<AmbientInsight[]> {
  const detected: AmbientInsight[] = [];
  const today = new Date();

  // Build parallel queries based on role
  const queries: Promise<void>[] = [];

  if (currentRole === "admin" || currentRole === "strategist") {
    // Stale applications in screening (7+ days)
    queries.push(
      (async () => {
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("status", "screening")
          .lt("updated_at", sevenDaysAgo);

        if (count && count > 0) {
          const bucket = Math.floor(count / 5) * 5;
          const key = `stale-apps-${bucket}`;
          if (!isDismissed(key)) {
            detected.push({
              id: "stale-applications",
              type: "stale_application",
              priority: 1,
              message: `${count} application${count > 1 ? "s" : ""} stuck in screening for 7+ days.`,
              actionLabel: "Review pipeline",
              actionPath: "/admin/pipeline",
              icon: "alert",
              dismissKey: key,
            });
          }
        }
      })()
    );

    // Upcoming job deadlines (within 3 days)
    queries.push(
      (async () => {
        const threeDaysOut = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .lte("application_deadline", threeDaysOut)
          .gte("application_deadline", today.toISOString());

        if (count && count > 0) {
          const bucket = Math.floor(count / 5) * 5;
          const key = `closing-jobs-${bucket}`;
          if (!isDismissed(key)) {
            detected.push({
              id: "upcoming-deadlines",
              type: "upcoming_deadline",
              priority: 2,
              message: `${count} job${count > 1 ? "s" : ""} closing within 3 days.`,
              actionLabel: "View jobs",
              actionPath: "/jobs",
              icon: "calendar",
              dismissKey: key,
            });
          }
        }
      })()
    );
  }

  if (currentRole === "partner" || currentRole === "admin" || currentRole === "strategist") {
    // CRM prospects with no touchpoints in 14+ days
    queries.push(
      (async () => {
        const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("crm_prospects")
          .select("id", { count: "exact", head: true })
          .lt("last_contact_date", fourteenDaysAgo)
          .not("status", "in", '("lost","won")');

        if (count && count > 0) {
          const bucket = Math.floor(count / 5) * 5;
          const key = `cold-prospects-${bucket}`;
          if (!isDismissed(key)) {
            detected.push({
              id: "uncontacted-leads",
              type: "uncontacted_lead",
              priority: 2,
              message: `${count} prospect${count > 1 ? "s" : ""} haven't been contacted in 14+ days.`,
              actionLabel: "Open CRM",
              actionPath: "/crm",
              icon: "users",
              dismissKey: key,
            });
          }
        }
      })()
    );
  }

  if (currentRole === "user") {
    // Missing meeting follow-ups
    queries.push(
      (async () => {
        const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("meetings")
          .select("id", { count: "exact", head: true })
          .eq("host_id", userId)
          .eq("status", "completed")
          .lt("actual_end", twoDaysAgo)
          .is("ai_summary", null);

        if (count && count > 0) {
          const bucket = Math.floor(count / 5) * 5;
          const key = `meeting-followup-${bucket}`;
          if (!isDismissed(key)) {
            detected.push({
              id: "missing-followups",
              type: "missing_followup",
              priority: 1,
              message: `${count} completed meeting${count > 1 ? "s" : ""} need follow-up notes.`,
              actionLabel: "View meetings",
              actionPath: "/meetings",
              icon: "clock",
              dismissKey: key,
            });
          }
        }
      })()
    );
  }

  await Promise.all(queries);
  detected.sort((a, b) => a.priority - b.priority);
  return detected;
}

export function useAmbientInsights() {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const queryClient = useQueryClient();

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ["ambient-insights", currentRole, user?.id],
    queryFn: () => fetchInsights(user!.id, currentRole || "user"),
    enabled: !!user && !!currentRole,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const dismiss = useCallback((insight: AmbientInsight) => {
    dismissInsight(insight.dismissKey);
    // Optimistically remove from cache
    queryClient.setQueryData<AmbientInsight[]>(
      ["ambient-insights", currentRole, user?.id],
      (prev) => prev?.filter((i) => i.id !== insight.id) ?? []
    );
  }, [queryClient, currentRole, user?.id]);

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["ambient-insights"] });
  }, [queryClient]);

  return { insights, loading: isLoading, dismiss, refresh };
}
