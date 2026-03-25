import { memo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gauge, UserPen, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  type UrgencyScoreResult,
  getUrgencyScoreColor,
  getUrgencyLabel,
  getUrgencyAccentHsl,
} from '@/lib/jobUrgencyScore';

interface UrgencyMeterProps {
  jobId: string;
  result: UrgencyScoreResult;
  isAdmin?: boolean;
  size?: 'sm' | 'md';
  variant?: 'badge' | 'dot';
  onManualScoreChange?: (score: number | null) => void;
  manualSetByName?: string | null;
  manualSetAt?: string | null;
}

/** Compact circular dot showing the score number */
const ScoreDot = memo(({ score, size }: { score: number; size: 'sm' | 'md' }) => {
  const dim = size === 'sm' ? 24 : 28;
  const fontSize = size === 'sm' ? 10 : 12;
  const accentColor = getUrgencyAccentHsl(score);

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white shrink-0"
      style={{
        width: dim,
        height: dim,
        fontSize,
        backgroundColor: accentColor,
      }}
    >
      {Math.round(score)}
    </div>
  );
});

ScoreDot.displayName = 'ScoreDot';

/** Circular arc gauge for urgency score 0-10 */
const ArcGauge = memo(({ score, size }: { score: number; size: 'sm' | 'md' }) => {
  const colors = getUrgencyScoreColor(score);
  const dim = size === 'sm' ? 36 : 44;
  const stroke = size === 'sm' ? 3 : 4;
  const radius = (dim - stroke) / 2;
  const circumference = Math.PI * radius;
  const progress = (score / 10) * circumference;
  const fontSize = size === 'sm' ? 11 : 14;

  return (
    <svg width={dim} height={dim / 2 + 6} viewBox={`0 0 ${dim} ${dim / 2 + 6}`} className="overflow-visible">
      <path
        d={`M ${stroke / 2} ${dim / 2} A ${radius} ${radius} 0 0 1 ${dim - stroke / 2} ${dim / 2}`}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <path
        d={`M ${stroke / 2} ${dim / 2} A ${radius} ${radius} 0 0 1 ${dim - stroke / 2} ${dim / 2}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={`${circumference - progress}`}
        className={colors.text}
      />
      <text
        x={dim / 2}
        y={dim / 2 + 2}
        textAnchor="middle"
        dominantBaseline="auto"
        fontSize={fontSize}
        fontWeight="700"
        className={cn('fill-current', colors.text)}
      >
        {Math.round(score * 10) / 10}
      </text>
    </svg>
  );
});

ArcGauge.displayName = 'ArcGauge';

/** Inline breakdown for tooltip / popover */
const BreakdownDisplay = memo(({ result }: { result: UrgencyScoreResult }) => (
  <div className="space-y-1.5 text-xs">
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">Time Pressure</span>
      <span className="font-medium">{result.breakdown.timePressure}/3</span>
    </div>
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">Pipeline Health</span>
      <span className="font-medium">{result.breakdown.pipelineHealth}/3</span>
    </div>
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">Activity Decay</span>
      <span className="font-medium">{result.breakdown.activityDecay}/2</span>
    </div>
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">Intel Boost</span>
      <span className="font-medium">{result.breakdown.intelligenceBoost}/2</span>
    </div>
    <div className="border-t border-border/30 pt-1.5 flex justify-between gap-4 font-semibold">
      <span>Data Score</span>
      <span>{result.dataScore}</span>
    </div>
  </div>
));

BreakdownDisplay.displayName = 'BreakdownDisplay';

export const UrgencyMeter = memo(({
  jobId,
  result,
  isAdmin = false,
  size = 'sm',
  variant = 'badge',
  onManualScoreChange,
  manualSetByName,
  manualSetAt,
}: UrgencyMeterProps) => {
  const [sliderValue, setSliderValue] = useState<number>(result.manualScore ?? result.dataScore);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const colors = getUrgencyScoreColor(result.effectiveScore);
  const label = getUrgencyLabel(result.effectiveScore);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('jobs')
        .update({
          urgency_score_manual: sliderValue,
          urgency_score_manual_set_by: user.id,
          urgency_score_manual_set_at: new Date().toISOString(),
        } as any)
        .eq('id', jobId);

      if (error) throw error;
      toast.success(`Urgency set to ${sliderValue}`);
      onManualScoreChange?.(sliderValue);
      setOpen(false);
    } catch {
      toast.error('Failed to update urgency');
    } finally {
      setSaving(false);
    }
  }, [jobId, sliderValue, onManualScoreChange]);

  const handleClear = useCallback(async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          urgency_score_manual: null,
          urgency_score_manual_set_by: null,
          urgency_score_manual_set_at: null,
        } as any)
        .eq('id', jobId);

      if (error) throw error;
      toast.success('Reverted to data-driven score');
      onManualScoreChange?.(null);
      setOpen(false);
    } catch {
      toast.error('Failed to clear override');
    } finally {
      setSaving(false);
    }
  }, [jobId, onManualScoreChange]);

  const isDot = variant === 'dot';

  const visualElement = isDot ? (
    <ScoreDot score={result.effectiveScore} size={size} />
  ) : (
    <ArcGauge score={result.effectiveScore} size={size} />
  );

  const meterContent = (
    <div
      className={cn(
        'inline-flex items-center gap-1 transition-colors',
        !isDot && 'rounded-lg px-1.5 py-0.5 border',
        !isDot && colors.bg,
        !isDot && colors.border,
        isAdmin && 'cursor-pointer',
        isAdmin && !isDot && 'hover:ring-2',
        isAdmin && !isDot && colors.ring,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {visualElement}
      {result.isManual && !isDot && (
        <UserPen className={cn('shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5', 'text-muted-foreground')} />
      )}
    </div>
  );

  // Admin: popover with slider + breakdown
  if (isAdmin) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {meterContent}
        </PopoverTrigger>
        <PopoverContent
          className="w-64 p-4 space-y-3"
          side="bottom"
          align="end"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Urgency Score</span>
            </div>
            <Badge variant="outline" className={cn('text-[10px]', colors.text, colors.bg, colors.border)}>
              {label}
            </Badge>
          </div>

          <BreakdownDisplay result={result} />

          <div className="space-y-2 pt-2 border-t border-border/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Manual Override</span>
              <span className={cn('text-sm font-bold', getUrgencyScoreColor(sliderValue).text)}>
                {sliderValue}
              </span>
            </div>
            <Slider
              value={[sliderValue]}
              onValueChange={([v]) => setSliderValue(v)}
              min={0}
              max={10}
              step={1}
              className="w-full"
            />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 h-7 text-xs" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Set Override'}
              </Button>
              {result.isManual && (
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleClear} disabled={saving}>
                  <X className="h-3 w-3" />
                  Clear
                </Button>
              )}
            </div>
            {result.isManual && manualSetByName && (
              <p className="text-[10px] text-muted-foreground">
                Set by {manualSetByName}
                {manualSetAt && ` • ${new Date(manualSetAt).toLocaleDateString()}`}
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Non-admin: tooltip with breakdown
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {meterContent}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Urgency: {label}</span>
            <Badge variant="outline" className={cn('text-[10px]', colors.text, colors.bg, colors.border)}>
              {result.effectiveScore}
            </Badge>
          </div>
          <BreakdownDisplay result={result} />
          {result.isManual && (
            <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/30">
              Manually set{manualSetByName ? ` by ${manualSetByName}` : ''}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

UrgencyMeter.displayName = 'UrgencyMeter';
