import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useRef } from "react";

export interface ActivationStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  actionPath: string;
  actionLabel: string;
  /** Weight for progress calculation (higher = more important) */
  weight: number;
}

export interface PartnerActivation {
  steps: ActivationStep[];
  /** 0–100, weighted */
  progress: number;
  completedCount: number;
  totalCount: number;
  allComplete: boolean;
  loading: boolean;
  /** Whether the user has permanently dismissed the checklist */
  dismissed: boolean;
  dismiss: () => void;
}

const DISMISS_KEY = "tqc_partner_activation_dismissed";

/**
 * Queries real data to compute partner activation state.
 * Uses the Endowed Progress Effect: "Account created" is always
 * pre-completed so the partner starts at 20 % instead of 0 %.
 */
export function usePartnerActivation(companyId: string | null): PartnerActivation {
  const { user } = useAuth();
  const celebratedRef = useRef<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["partner-activation", companyId, user?.id],
    queryFn: async () => {
      if (!companyId || !user) return null;

      // Run all checks in parallel
      const [
        profileRes,
        companyRes,
        jobsRes,
        reviewRes,
        meetingRes,
      ] = await Promise.all([
        // 1. Profile photo
        supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single(),

        // 2. Company profile completeness (logo + description)
        supabase
          .from("companies")
          .select("logo_url, description")
          .eq("id", companyId)
          .single(),

        // 3. Has posted at least one role (any status beyond draft)
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .in("status", ["published", "active", "open"]),

        // 4. Has reviewed at least one candidate
        supabase
          .from("applications")
          .select("id, jobs!inner(company_id)", { count: "exact", head: true })
          .eq("jobs.company_id", companyId)
          .in("partner_review_status", ["approved", "rejected"]),

        // 5. Has scheduled or completed at least one meeting
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .in("status", ["confirmed", "completed"]),
      ]);

      return {
        hasAvatar: !!profileRes.data?.avatar_url,
        hasCompanyProfile:
          !!companyRes.data?.logo_url && !!companyRes.data?.description,
        hasPostedRole: (jobsRes.count ?? 0) > 0,
        hasReviewedCandidate: (reviewRes.count ?? 0) > 0,
        hasScheduledCall: (meetingRes.count ?? 0) > 0,
      };
    },
    enabled: !!companyId && !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  // ---------------------------------------------------------------------------
  // Build steps
  // ---------------------------------------------------------------------------
  const checks = data ?? {
    hasAvatar: false,
    hasCompanyProfile: false,
    hasPostedRole: false,
    hasReviewedCandidate: false,
    hasScheduledCall: false,
  };

  const steps: ActivationStep[] = [
    {
      id: "account_created",
      title: "Account created",
      description: "You're in — welcome to the network.",
      completed: true, // Endowed Progress: always done
      actionPath: "/home",
      actionLabel: "Done",
      weight: 1,
    },
    {
      id: "company_profile",
      title: "Complete your company profile",
      description: "Add your logo and a short description so candidates recognise you.",
      completed: checks.hasCompanyProfile,
      actionPath: "/settings?tab=company",
      actionLabel: "Set up",
      weight: 1.5,
    },
    {
      id: "first_role",
      title: "Post your first role",
      description: "Receive a curated shortlist within 48 hours.",
      completed: checks.hasPostedRole,
      actionPath: "/company-jobs/new",
      actionLabel: "Post role",
      weight: 3, // Highest weight — the key activation event
    },
    {
      id: "first_review",
      title: "Review your first candidate",
      description: "Give feedback so your strategist can refine the search.",
      completed: checks.hasReviewedCandidate,
      actionPath: "/company-applications",
      actionLabel: "Review",
      weight: 2,
    },
    {
      id: "strategy_call",
      title: "Schedule a strategy call",
      description: "15 minutes with your strategist to align on the brief.",
      completed: checks.hasScheduledCall,
      actionPath: "/book/darryl",
      actionLabel: "Book call",
      weight: 1.5,
    },
  ];

  const totalWeight = steps.reduce((sum, s) => sum + s.weight, 0);
  const completedWeight = steps
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + s.weight, 0);
  const progress = Math.round((completedWeight / totalWeight) * 100);
  const completedCount = steps.filter((s) => s.completed).length;
  const allComplete = completedCount === steps.length;

  // ---------------------------------------------------------------------------
  // Log activation events for newly completed milestones
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!user || !companyId || isLoading || !data) return;

    steps.forEach((step) => {
      if (
        step.completed &&
        step.id !== "account_created" &&
        !celebratedRef.current.has(step.id)
      ) {
        celebratedRef.current.add(step.id);

        // Fire-and-forget: log to activation_events
        supabase.from("activation_events").insert({
          user_id: user.id,
          company_id: companyId,
          event_type: `partner_${step.id}_completed`,
          event_category: "onboarding",
          milestone_name: step.id,
          milestone_order: steps.findIndex((s) => s.id === step.id),
          event_data: { progress, completedCount },
        });
      }
    });
  }, [data, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Dismiss
  // ---------------------------------------------------------------------------
  const dismissed =
    typeof window !== "undefined"
      ? localStorage.getItem(DISMISS_KEY) === "true"
      : false;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    // Force re-render via window storage event
    window.dispatchEvent(new Event("storage"));
  };

  return {
    steps,
    progress,
    completedCount,
    totalCount: steps.length,
    allComplete,
    loading: isLoading,
    dismissed,
    dismiss,
  };
}
