import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Clock, Loader2, RotateCcw, Sparkles } from "lucide-react";

export type EnrichmentResult = {
  id: string;
  name: string;
  status: 'enriched' | 'failed' | 'skipped' | 'pending' | 'enriching';
  reason?: string;
  fields_updated?: string[];
};

interface LinkedInEnrichmentProgressProps {
  results: EnrichmentResult[];
  isRunning: boolean;
  onRetryFailed: () => void;
  onDismiss: () => void;
}

const STATUS_CONFIG = {
  enriched: { icon: CheckCircle2, label: 'Enriched', className: 'text-emerald-500' },
  failed: { icon: XCircle, label: 'Failed', className: 'text-red-500' },
  skipped: { icon: Clock, label: 'Skipped', className: 'text-muted-foreground' },
  pending: { icon: Clock, label: 'Pending', className: 'text-muted-foreground' },
  enriching: { icon: Loader2, label: 'Enriching...', className: 'text-primary animate-spin' },
};

export function LinkedInEnrichmentProgress({
  results,
  isRunning,
  onRetryFailed,
  onDismiss,
}: LinkedInEnrichmentProgressProps) {
  const total = results.length;
  const completed = results.filter(r => ['enriched', 'failed', 'skipped'].includes(r.status)).length;
  const enrichedCount = results.filter(r => r.status === 'enriched').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="border border-border/30 rounded-lg p-4 space-y-3 bg-card/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          LinkedIn Enrichment
        </div>
        <div className="flex items-center gap-2">
          {!isRunning && failedCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onRetryFailed} className="h-7 gap-1 text-xs">
              <RotateCcw className="h-3 w-3" />
              Retry {failedCount} failed
            </Button>
          )}
          {!isRunning && (
            <Button variant="ghost" size="sm" onClick={onDismiss} className="h-7 text-xs">
              Dismiss
            </Button>
          )}
        </div>
      </div>

      <Progress value={progressPercent} className="h-1.5" />

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{completed}/{total} processed</span>
        {enrichedCount > 0 && <span className="text-emerald-500">{enrichedCount} enriched</span>}
        {failedCount > 0 && <span className="text-red-500">{failedCount} failed</span>}
      </div>

      <div className="max-h-[200px] overflow-y-auto space-y-1">
        {results.map((r) => {
          const config = STATUS_CONFIG[r.status];
          const Icon = config.icon;

          return (
            <div key={r.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-md hover:bg-muted/10">
              <div className="flex items-center gap-2 min-w-0">
                <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${config.className}`} />
                <span className="truncate">{r.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {r.fields_updated && r.fields_updated.length > 0 && (
                  <span className="text-muted-foreground">
                    {r.fields_updated.length} field{r.fields_updated.length !== 1 ? 's' : ''}
                  </span>
                )}
                {r.reason && r.status !== 'enriched' && (
                  <span className="text-muted-foreground truncate max-w-[160px]" title={r.reason}>
                    {r.reason}
                  </span>
                )}
                <Badge variant="outline" className={`text-[9px] ${config.className} border-current/20`}>
                  {config.label}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
