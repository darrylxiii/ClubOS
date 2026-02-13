import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Flame, Snowflake, AlertTriangle, TrendingUp, Eye, X, Zap } from "lucide-react";
import { usePredictiveSignals, useAcknowledgeSignal } from "@/hooks/usePredictiveSignals";
import { cn } from "@/lib/utils";

const signalConfig: Record<string, { icon: typeof Flame; color: string; label: string }> = {
  heating_up: { icon: Flame, color: "text-orange-500 bg-orange-500/10", label: "Heating Up" },
  cooling_off: { icon: Snowflake, color: "text-blue-400 bg-blue-400/10", label: "Cooling Off" },
  hiring_intent: { icon: TrendingUp, color: "text-emerald-500 bg-emerald-500/10", label: "Hiring Intent" },
  relationship_risk: { icon: AlertTriangle, color: "text-destructive bg-destructive/10", label: "At Risk" },
  opportunity_window: { icon: Zap, color: "text-amber-500 bg-amber-500/10", label: "Opportunity" },
  re_engagement: { icon: Eye, color: "text-purple-400 bg-purple-400/10", label: "Re-engage" },
};

function getSignalConfig(type: string) {
  return signalConfig[type] || { icon: AlertTriangle, color: "text-muted-foreground bg-muted/50", label: type };
}

function strengthLabel(strength: number) {
  if (strength >= 0.8) return "Strong";
  if (strength >= 0.6) return "Medium";
  return "Weak";
}

export function PredictiveSignalsStrip() {
  const { data: signals, isLoading } = usePredictiveSignals();
  const acknowledge = useAcknowledgeSignal();

  if (isLoading) {
    return (
      <Card className="glass-subtle rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-amber-500" />
            Predictive Signals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-28 w-56 rounded-xl shrink-0" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!signals?.length) return null;

  return (
    <Card className="glass-subtle rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-amber-500" />
            Predictive Signals
            <Badge variant="secondary" className="text-xs">{signals.length}</Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2">
            {signals.map(signal => {
              const config = getSignalConfig(signal.signal_type);
              const Icon = config.icon;
              return (
                <div
                  key={signal.id}
                  className="shrink-0 w-60 rounded-xl border border-border/20 bg-card/20 p-3 space-y-2 backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className={cn("p-1.5 rounded-lg", config.color)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 min-h-0 min-w-0"
                      onClick={() => acknowledge.mutate(signal.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{config.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {signal.entity_type}: {signal.entity_id.slice(0, 8)}…
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className={cn("text-[10px]", signal.signal_strength >= 0.7 ? "text-destructive" : "")}
                    >
                      {strengthLabel(signal.signal_strength)} ({Math.round(signal.signal_strength * 100)}%)
                    </Badge>
                  </div>
                  {signal.recommended_actions?.[0] && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      → {signal.recommended_actions[0]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
