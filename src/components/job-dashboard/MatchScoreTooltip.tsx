import { memo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MatchScoreRing } from "./MatchScoreRing";
import { useTranslation } from "react-i18next";

interface MatchScoreTooltipProps {
  score: number;
  matchFactors?: Record<string, unknown>;
}

export const MatchScoreTooltip = memo(({ score, matchFactors }: MatchScoreTooltipProps) => {
  const { t } = useTranslation('jobDashboard');

  // Extract top factors and gaps from match_factors JSONB
  const factors: string[] = [];
  const gaps: string[] = [];

  if (matchFactors && typeof matchFactors === 'object') {
    // Common match_factors keys: skill_match, experience_match, location_match, education_match, etc.
    const entries = Object.entries(matchFactors).filter(
      ([, v]) => typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean'
    );

    entries
      .filter(([, v]) => (typeof v === 'number' ? v >= 70 : v === true || v === 'match'))
      .slice(0, 3)
      .forEach(([key]) => factors.push(formatKey(key)));

    entries
      .filter(([, v]) => (typeof v === 'number' ? v < 50 : v === false || v === 'gap'))
      .slice(0, 2)
      .forEach(([key]) => gaps.push(formatKey(key)));
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <MatchScoreRing score={score} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[200px] text-xs space-y-1.5 p-3">
          <p className="font-semibold">{score}% {t('matchScore.title', 'Match')}</p>
          {factors.length > 0 && (
            <div>
              <p className="text-success text-[10px] font-medium mb-0.5">
                {t('matchScore.strengths', 'Strengths')}
              </p>
              {factors.map((f) => (
                <p key={f} className="text-[10px] text-muted-foreground">+ {f}</p>
              ))}
            </div>
          )}
          {gaps.length > 0 && (
            <div>
              <p className="text-destructive text-[10px] font-medium mb-0.5">
                {t('matchScore.gaps', 'Gaps')}
              </p>
              {gaps.map((g) => (
                <p key={g} className="text-[10px] text-muted-foreground">- {g}</p>
              ))}
            </div>
          )}
          {factors.length === 0 && gaps.length === 0 && (
            <p className="text-[10px] text-muted-foreground">
              {t('matchScore.noDetails', 'No detailed breakdown available')}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

MatchScoreTooltip.displayName = 'MatchScoreTooltip';

function formatKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
