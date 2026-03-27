import { useTranslation } from 'react-i18next';
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CompactProfileStrength() {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: completion } = useQuery({
    queryKey: ['profile-strength', user?.id],
    queryFn: async () => {
      const [{ data: profileData }, { data: candidateData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, current_title, bio, avatar_url, phone, location, linkedin_url, preferred_currency, resume_url, current_salary_min')
          .eq('id', user!.id)
          .maybeSingle(),
        supabase
          .from('candidate_profiles')
          .select('skills, current_title, work_authorization, industries, resume_url')
          .eq('user_id', user!.id)
          .maybeSingle(),
      ]);

      const profileFields = profileData ? [
        profileData.full_name, profileData.current_title, profileData.bio, profileData.avatar_url,
        profileData.phone, profileData.location, profileData.linkedin_url, profileData.preferred_currency,
        profileData.resume_url, profileData.current_salary_min,
      ] : [];

      const candidateFields = candidateData ? [
        candidateData.skills ? candidateData.skills : null,
        candidateData.current_title,
        candidateData.work_authorization,
        candidateData.industries && (candidateData.industries as string[]).length > 0 ? candidateData.industries : null,
        candidateData.resume_url,
      ] : [];

      const allFields = [...profileFields, ...candidateFields];
      const filled = allFields.filter(v => v !== null && v !== undefined && v !== '').length;
      return Math.round((filled / Math.max(allFields.length, 1)) * 100);
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  if (completion === undefined || completion === 100) return null;

  return (
    <div className="glass-subtle rounded-2xl px-5 py-3.5 flex items-center gap-4">
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{t("profile_strength", "Profile strength")}</span>
      <Progress value={completion} className="flex-1 h-2" />
      <span className="text-xs font-medium tabular-nums shrink-0">{completion}%</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs shrink-0 px-2"
        onClick={() => navigate('/settings?tab=profile')}
      >
        Complete
        <ArrowRight className="h-3 w-3 ml-1" />
      </Button>
    </div>
  );
}
