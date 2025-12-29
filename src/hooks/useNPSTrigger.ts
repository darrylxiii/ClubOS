import { useEffect, useCallback, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSubmitNPS } from "@/hooks/useQuantumKPIs";
import { toast } from "sonner";

type NPSTriggerEvent = 
  | "placement_completed" 
  | "interview_completed" 
  | "offer_accepted" 
  | "30_days_post_hire"
  | "application_rejected";

interface NPSTriggerConfig {
  event: NPSTriggerEvent;
  jobId?: string;
  applicationId?: string;
  surveyType: "candidate" | "client";
}

export function useNPSTrigger() {
  const { user } = useAuth();
  const submitNPS = useSubmitNPS();
  const [pendingTrigger, setPendingTrigger] = useState<NPSTriggerConfig | null>(null);
  const [showNPSModal, setShowNPSModal] = useState(false);

  const checkRecentSurvey = useCallback(async (userId: string, surveyType: string): Promise<boolean> => {
    // Don't trigger if user completed a survey in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data } = await supabase
      .from("nps_surveys")
      .select("id")
      .eq("respondent_id", userId)
      .eq("survey_type", surveyType)
      .gte("response_date", thirtyDaysAgo.toISOString())
      .limit(1);

    return (data?.length || 0) > 0;
  }, []);

  const triggerNPS = useCallback(async (config: NPSTriggerConfig) => {
    if (!user?.id) return;

    const hasRecentSurvey = await checkRecentSurvey(user.id, config.surveyType);
    if (hasRecentSurvey) {
      console.log("NPS: Skipping - user completed survey recently");
      return;
    }

    setPendingTrigger(config);
    setShowNPSModal(true);
  }, [user, checkRecentSurvey]);

  const submitScore = useCallback(async (score: number, feedbackText?: string) => {
    if (!user?.id || !pendingTrigger) return;

    try {
      await submitNPS.mutateAsync({
        survey_type: pendingTrigger.surveyType,
        respondent_id: user.id,
        respondent_type: pendingTrigger.surveyType === "candidate" ? "candidate" : "partner",
        nps_score: score,
        job_id: pendingTrigger.jobId,
        application_id: pendingTrigger.applicationId,
        stage_name: pendingTrigger.event,
        feedback_text: feedbackText,
      });

      toast.success("Thank you for your feedback");
      setShowNPSModal(false);
      setPendingTrigger(null);
    } catch (error) {
      console.error("Failed to submit NPS:", error);
      toast.error("Failed to submit feedback");
    }
  }, [user, pendingTrigger, submitNPS]);

  const dismissNPS = useCallback(() => {
    setShowNPSModal(false);
    setPendingTrigger(null);
  }, []);

  // Auto-trigger based on application status changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("nps-triggers")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "applications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = payload.new?.status;
          const oldStatus = payload.old?.status;

          if (newStatus === "hired" && oldStatus !== "hired") {
            triggerNPS({
              event: "offer_accepted",
              applicationId: payload.new.id,
              jobId: payload.new.job_id,
              surveyType: "candidate",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, triggerNPS]);

  return {
    triggerNPS,
    submitScore,
    dismissNPS,
    showNPSModal,
    pendingTrigger,
    isSubmitting: submitNPS.isPending,
  };
}

// Trigger events mapping for manual use
export const NPS_TRIGGER_EVENTS = {
  PLACEMENT_COMPLETED: "placement_completed",
  INTERVIEW_COMPLETED: "interview_completed",
  OFFER_ACCEPTED: "offer_accepted",
  THIRTY_DAYS_POST_HIRE: "30_days_post_hire",
  APPLICATION_REJECTED: "application_rejected",
} as const;
