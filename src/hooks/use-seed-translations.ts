import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import commonEn from "@/i18n/locales/en/common.json";
import authEn from "@/i18n/locales/en/auth.json";
import onboardingEn from "@/i18n/locales/en/onboarding.json";

export const useSeedTranslations = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const translationsData = [
        { namespace: 'common', language: 'en', translations: commonEn },
        { namespace: 'auth', language: 'en', translations: authEn },
        { namespace: 'onboarding', language: 'en', translations: onboardingEn },
      ];

      const { data, error } = await supabase.functions.invoke('seed-translations', {
        body: { translationsData },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`✅ English translations seeded! ${data.summary.success} namespaces ready. You can now generate other languages.`);
      queryClient.invalidateQueries({ queryKey: ['english-translations-exist'] });
      queryClient.invalidateQueries({ queryKey: ['translation-coverage'] });
    },
    onError: (error: any) => {
      console.error('[Seed Translations] Error:', error);
      toast.error(error.message || 'Failed to seed English translations');
    }
  });
};