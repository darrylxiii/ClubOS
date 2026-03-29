import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Brain, Target, Award, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const TOTAL_ASSESSMENTS = 6;

export function CompactAssessmentProgress() {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["assessment-progress", user?.id],
    queryFn: async () => {
      const { data: results, error } = await supabase
        .from("assessment_results")
        .select("assessment_id, score, is_latest")
        .eq("user_id", user!.id)
        .eq("is_latest", true);

      if (error) {
        console.warn("[AssessmentProgress] Could not fetch:", error.message);
        return { completed: 0, avgScore: 0 };
      }

      const uniqueAssessments = new Set(results?.map((r) => r.assessment_id)).size;
      const scores = results?.filter((r) => r.score !== null).map((r) => r.score!) || [];
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      return { completed: uniqueAssessments, avgScore };
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (isLoading) return null;

  const stats = data || { completed: 0, avgScore: 0 };
  const progressPct = Math.round((stats.completed / TOTAL_ASSESSMENTS) * 100);

  return (
    <div className="glass-subtle rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
            <Brain className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t("dashboardSection.assessmentProgress.title")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("dashboardSection.assessmentProgress.completed", { completed: stats.completed, total: TOTAL_ASSESSMENTS })}
            </p>
          </div>
        </div>
        {stats.avgScore > 0 && (
          <div className="text-right">
            <div className="text-lg font-bold">{stats.avgScore}%</div>
            <div className="text-[10px] text-muted-foreground">{t("dashboardSection.assessmentProgress.avgScore")}</div>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <Progress value={progressPct} className="h-2" />
        <p className="text-[11px] text-muted-foreground text-right">
          {t("dashboardSection.assessmentProgress.percentComplete", { percent: progressPct })}
        </p>
      </div>

      {stats.completed < TOTAL_ASSESSMENTS ? (
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => navigate("/assessments")}>
          <Target className="h-3 w-3 mr-1" />
          {t("dashboardSection.assessmentProgress.continue")}
          <ChevronRight className="h-3 w-3 ml-auto" />
        </Button>
      ) : (
        <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => navigate("/assessments")}>
          <Award className="h-3 w-3 mr-1" />
          {t("dashboardSection.assessmentProgress.viewResults")}
          <ChevronRight className="h-3 w-3 ml-auto" />
        </Button>
      )}
    </div>
  );
}
