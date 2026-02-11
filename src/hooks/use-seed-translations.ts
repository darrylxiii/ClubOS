import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Import existing English translations
import commonEn from "@/i18n/locales/en/common.json";
import authEn from "@/i18n/locales/en/auth.json";
import onboardingEn from "@/i18n/locales/en/onboarding.json";

// Additional namespaces - these will be fetched from database if they exist
// or seeded with minimal defaults if not
const ADDITIONAL_NAMESPACES = [
  'admin', 'analytics', 'candidates', 'compliance', 
  'contracts', 'jobs', 'meetings', 'messages', 'partner', 'settings'
];

// Minimal English translations for additional namespaces
const getDefaultTranslations = (namespace: string) => {
  const defaults: Record<string, Record<string, unknown>> = {
    admin: {
      title: "Admin Dashboard",
      users: { title: "Users", manage: "Manage Users" },
      settings: { title: "Settings", save: "Save Changes" }
    },
    analytics: {
      title: "Analytics",
      overview: "Overview",
      metrics: { title: "Key Metrics", views: "Views", clicks: "Clicks" }
    },
    candidates: {
      title: "Candidates",
      profile: { title: "Profile", edit: "Edit Profile" },
      applications: { title: "Applications", view: "View Applications" }
    },
    compliance: {
      title: "Compliance",
      gdpr: { title: "GDPR", consent: "Cookie Consent" }
    },
    contracts: {
      title: "Contracts",
      create: "Create Contract",
      sign: "Sign Contract"
    },
    jobs: {
      title: "Jobs",
      create: "Create Job",
      apply: "Apply Now",
      details: { title: "Job Details", description: "Description", requirements: "Requirements" }
    },
    meetings: {
      title: "Meetings",
      schedule: "Schedule Meeting",
      join: "Join Meeting",
      upcoming: "Upcoming Meetings"
    },
    messages: {
      title: "Messages",
      compose: "Compose",
      inbox: "Inbox",
      sent: "Sent"
    },
    partner: {
      title: "Partner Portal",
      dashboard: "Dashboard",
      candidates: "Candidates",
      jobs: "Jobs"
    },
    settings: {
      title: "Settings",
      profile: "Profile Settings",
      notifications: "Notifications",
      privacy: "Privacy",
      save: "Save Changes"
    }
  };
  
  return defaults[namespace] || { title: namespace };
};

export const useSeedTranslations = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Core namespaces from local JSON files
      const coreTranslations = [
        { namespace: 'common', language: 'en', translations: commonEn },
        { namespace: 'auth', language: 'en', translations: authEn },
        { namespace: 'onboarding', language: 'en', translations: onboardingEn },
      ];

      // Check which additional namespaces need seeding
      const { data: existingNamespaces } = await supabase
        .from('translations')
        .select('namespace')
        .eq('language', 'en')
        .eq('is_active', true);
      
      const existingNs = new Set(existingNamespaces?.map(n => n.namespace) || []);
      
      // Add default translations for missing namespaces
      const additionalTranslations = ADDITIONAL_NAMESPACES
        .filter(ns => !existingNs.has(ns))
        .map(ns => ({
          namespace: ns,
          language: 'en',
          translations: getDefaultTranslations(ns)
        }));

      const allTranslations = [...coreTranslations, ...additionalTranslations];

      const { data, error } = await supabase.functions.invoke('seed-translations', {
        body: { translationsData: allTranslations },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const count = data?.summary?.success || 0;
      toast.success(`✅ Seeded ${count} English namespaces. Ready to generate other languages.`);
      queryClient.invalidateQueries({ queryKey: ['english-translations-exist'] });
      queryClient.invalidateQueries({ queryKey: ['translation-coverage'] });
      queryClient.invalidateQueries({ queryKey: ['db-namespaces'] });
    },
    onError: (error: Error) => {
      console.error('[Seed Translations] Error:', error);
      toast.error(error.message || 'Failed to seed English translations');
    }
  });
};
