import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CompactProfileStrength() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: completion } = useQuery({
    queryKey: ['profile-strength', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, current_title, bio, avatar_url, phone, location, linkedin_url, preferred_currency, resume_url, current_salary_min')
        .eq('id', user!.id)
        .maybeSingle();

      if (!data) return 0;

      const fields = [
        data.full_name, data.current_title, data.bio, data.avatar_url,
        data.phone, data.location, data.linkedin_url, data.preferred_currency,
        data.resume_url, data.current_salary_min,
      ];
      const filled = fields.filter(v => v !== null && v !== undefined && v !== '').length;
      return Math.round((filled / fields.length) * 100);
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  if (completion === undefined || completion === 100) return null;

  return (
    <div className="glass-subtle rounded-2xl px-5 py-3.5 flex items-center gap-4">
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">Profile strength</span>
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
