import { useTranslation } from 'react-i18next';
import { Card } from "@/components/ui/card";
import { usePipelineVelocity } from "@/hooks/useDealPipeline";
import { Loader2 } from "lucide-react";

export function PipelineConversionFunnel() {
  const { t } = useTranslation('common');
  const { data, isLoading, error } = usePipelineVelocity();

  if (isLoading) {
    return (
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
        <h3 className="text-lg font-semibold mb-4 text-foreground">{t("pipeline_funnel", "Pipeline Funnel")}</h3>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
        <h3 className="text-lg font-semibold mb-4 text-foreground">{t("pipeline_funnel", "Pipeline Funnel")}</h3>
        <p className="text-sm text-muted-foreground">{t("unable_to_load_funnel", "Unable to load funnel data.")}</p>
      </Card>
    );
  }

  const stages = (data.stage_distribution || []).filter(
    (s: any) => s.stage_name !== 'Closed Lost'
  );

  if (stages.length === 0) {
    return (
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
        <h3 className="text-lg font-semibold mb-4 text-foreground">{t("pipeline_funnel", "Pipeline Funnel")}</h3>
        <p className="text-sm text-muted-foreground">{t("not_enough_data_to", "Not enough data to display funnel.")}</p>
      </Card>
    );
  }

  const maxCount = Math.max(...stages.map((s: any) => s.job_count || 0), 1);

  // Calculate conversion rates between consecutive stages
  const getConversionRate = (fromStage: string, toStage: string): number | null => {
    const conversions = data.conversion_rates || [];
    const match = conversions.find(
      (c: any) => c.from_stage === fromStage && c.to_stage === toStage
    );
    if (!match) return null;
    const fromCount = stages.find((s: any) => s.stage_name === fromStage)?.job_count || 0;
    if (fromCount === 0) return null;
    return Math.round((match.transition_count / fromCount) * 100);
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
      <h3 className="text-lg font-semibold mb-4 text-foreground">{t("pipeline_funnel", "Pipeline Funnel")}</h3>
      <div className="space-y-2">
        {stages.map((stage: any, index: number) => {
          const widthPct = Math.max((stage.job_count / maxCount) * 100, 8);
          const nextStage = stages[index + 1];
          const convRate = nextStage
            ? getConversionRate(stage.stage_name, nextStage.stage_name)
            : null;

          return (
            <div key={stage.stage_name}>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-24 text-right shrink-0">
                  {stage.stage_name}
                </span>
                <div className="flex-1 relative">
                  <div
                    className="h-8 rounded-md flex items-center px-3 transition-all"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: stage.color || 'hsl(var(--primary))',
                      opacity: 0.85,
                    }}
                  >
                    <span className="text-xs font-semibold text-white drop-shadow-sm">
                      {stage.job_count}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-12 shrink-0">
                  {stage.probability_weight}%
                </span>
              </div>
              {convRate !== null && (
                <div className="flex items-center gap-3 py-0.5">
                  <span className="w-24" />
                  <span className="text-[10px] text-muted-foreground/70 pl-2">
                    ↓ {Math.min(convRate, 100)}% conversion
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
