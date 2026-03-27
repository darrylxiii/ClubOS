import { useTranslation } from 'react-i18next';
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

interface ProfileStrengthMeterProps {
  userId?: string;
}

export function ProfileStrengthMeter({ userId }: ProfileStrengthMeterProps) {
  const { t } = useTranslation('common');
  const [completion, setCompletion] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;

    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, current_title, bio, avatar_url, phone, location, linkedin_url, preferred_currency, resume_url, current_salary_min')
        .eq('id', userId)
        .single();

      if (!data) { setCompletion(0); return; }

      const fields = [
        data.full_name, data.current_title, data.bio, data.avatar_url,
        data.phone, data.location, data.linkedin_url, data.preferred_currency,
        data.resume_url, data.current_salary_min,
      ];
      const filled = fields.filter(v => v !== null && v !== undefined && v !== '').length;
      setCompletion(Math.round((filled / fields.length) * 100));
    })();
  }, [userId]);

  if (completion === null) {
    return <div className="h-8 animate-pulse bg-muted rounded" />;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{t("profile_completeness", "Profile Completeness")}</span>
        <span className="font-semibold">{completion}%</span>
      </div>
      <Progress value={completion} className="h-2" />
      {completion < 100 && (
        <p className="text-xs text-muted-foreground mt-2">
          Add more details to your profile to increase visibility with recruiters
        </p>
      )}
    </div>
  );
}
