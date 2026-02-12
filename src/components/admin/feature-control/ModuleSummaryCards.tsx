import { Card, CardContent } from '@/components/ui/card';
import { ToggleLeft, ToggleRight, Zap } from 'lucide-react';

interface ModuleSummaryCardsProps {
  activeCount: number;
  disabledCount: number;
  pollingSavings: number;
}

export function ModuleSummaryCards({ activeCount, disabledCount, pollingSavings }: ModuleSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <ToggleRight className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-sm text-muted-foreground">Active Modules</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <ToggleLeft className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{disabledCount}</p>
              <p className="text-sm text-muted-foreground">Disabled Modules</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <Zap className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pollingSavings.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Queries Saved / Hour</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
