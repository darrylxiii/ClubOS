import { useAdminKPIScorecard } from "@/hooks/useAdminKPIScorecard";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

function calcHealthScore(data: ReturnType<typeof useAdminKPIScorecard>["data"]): number {
  if (!data) return 0;

  const scores: number[] = [];

  // Efficiency pillar (lower is better for time metrics)
  if (data.efficiency.slaCompliance.value != null) scores.push(Math.min(data.efficiency.slaCompliance.value, 100));
  if (data.efficiency.timeToHire.value != null) scores.push(Math.max(0, 100 - data.efficiency.timeToHire.value * 2));

  // Profitability pillar
  if (data.profitability.pipelineConversion.value != null) scores.push(Math.min(data.profitability.pipelineConversion.value * 10, 100));

  // Operations pillar
  if (data.operations.fillRate.value != null) scores.push(data.operations.fillRate.value);
  if (data.operations.offerAcceptance.value != null) scores.push(data.operations.offerAcceptance.value);

  // NPS pillar (NPS ranges -100 to +100, normalize to 0-100)
  if (data.nps.candidateNPS.value != null) scores.push(Math.max(0, (data.nps.candidateNPS.value + 100) / 2));
  if (data.nps.partnerNPS.value != null) scores.push(Math.max(0, (data.nps.partnerNPS.value + 100) / 2));

  if (scores.length === 0) return 50;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function CEOHealthScore() {
  const { t } = useTranslation('common');
  const { data, isLoading } = useAdminKPIScorecard("30d");
  const score = calcHealthScore(data);

  const size = 56;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const color = score >= 70 ? "text-emerald-500" : score >= 40 ? "text-amber-500" : "text-destructive";
  const strokeColor = score >= 70 ? "stroke-emerald-500" : score >= 40 ? "stroke-amber-500" : "stroke-destructive";

  if (isLoading) {
    return (
      <div className="h-14 w-14 rounded-full bg-muted animate-pulse" />
    );
  }

  return (
    <div className="relative flex items-center justify-center" title={`${t('dashboard.businessHealth', 'Business Health')}: ${score}/100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={strokeColor}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
        />
      </svg>
      <span className={cn("absolute text-sm font-bold", color)}>{score}</span>
    </div>
  );
}
