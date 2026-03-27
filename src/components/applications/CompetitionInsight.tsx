import { useTranslation } from 'react-i18next';
import { Users } from "lucide-react";

interface CompetitionInsightProps {
  totalCandidates: number;
}

export function CompetitionInsight({ 
  totalCandidates,
}: CompetitionInsightProps) {
  const { t } = useTranslation('common');
  return (
    <div className="p-4 rounded-xl bg-card/30 backdrop-blur-[var(--blur-glass)] border border-border/20 h-full flex flex-col">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">{t("candidate_pool", "Candidate Pool")}</div>
      
      <div className="space-y-3 flex-1">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
          <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">{t("other_candidates", "Other candidates")}</div>
            <div className="text-sm font-medium">{totalCandidates} in pipeline</div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Your strategist will guide you through each stage. Focus on preparation.
        </p>
      </div>
    </div>
  );
}
