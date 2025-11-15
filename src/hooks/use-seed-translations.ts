import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import commonEn from "@/i18n/locales/en/common.json";
import authEn from "@/i18n/locales/en/auth.json";
import onboardingEn from "@/i18n/locales/en/onboarding.json";

export const useSeedTranslations = () => {
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
  });
};