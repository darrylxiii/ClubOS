import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function useAvailabilityOnboarding() {
  const { user } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check if user has completed availability onboarding
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("availability_onboarding_completed")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Error checking onboarding status:", profileError);
          setLoading(false);
          return;
        }

        // Also check if they have any availability settings
        const { data: settings, error: settingsError } = await supabase
          .from("booking_availability_settings")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        // User needs onboarding if:
        // 1. They haven't completed it AND
        // 2. They don't have any availability settings
        const needsSetup = !profile?.availability_onboarding_completed && !settings;
        setNeedsOnboarding(needsSetup);
      } catch (error) {
        console.error("Error checking onboarding:", error);
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  const markComplete = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from("profiles")
        .update({ availability_onboarding_completed: true })
        .eq("id", user.id);
      
      setNeedsOnboarding(false);
    } catch (error) {
      console.error("Error marking onboarding complete:", error);
    }
  };

  return {
    needsOnboarding,
    loading,
    markComplete,
  };
}
