import { memo, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Zap, DollarSign, MapPin, TrendingUp } from 'lucide-react';
import type { IncubatorScenario } from '@/types/assessment';

interface IncubatorBriefScreenProps {
  scenario: IncubatorScenario;
  onComplete: () => void;
}

export const IncubatorBriefScreen = memo(({ scenario, onComplete }: IncubatorBriefScreenProps) => {
  const [countdown, setCountdown] = useState(45);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
          return 0;
        }
        return prev - 1;
      });
      setProgress(prev => Math.max(0, prev - (100 / 45)));
    }, 1000);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="max-w-3xl w-full shadow-xl">
        <CardContent className="p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="text-6xl mb-4 animate-pulse">🚀</div>
            <h1 className="text-4xl font-bold font-serif">Your Challenge</h1>
            <p className="text-muted-foreground">Read carefully. You have 45 seconds.</p>
          </div>

          <Progress value={progress} className="h-2" />

          {/* Scenario Details */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge variant="outline" className="text-sm">{scenario.industry}</Badge>
              <Badge variant="outline" className="text-sm">{scenario.stage}</Badge>
            </div>

            <h2 className="text-2xl font-bold">{scenario.title}</h2>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Budget (12 weeks)</span>
                </div>
                <p className="text-2xl font-bold">${(scenario.budget / 1000).toFixed(0)}k</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm">Stage</span>
                </div>
                <p className="text-lg font-semibold">{scenario.stage}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">Region</span>
                </div>
                <p className="text-lg font-semibold">{scenario.region}</p>
              </div>
            </div>

            {/* Target Customer */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Target Customer</p>
              <p className="font-semibold">{scenario.customer}</p>
            </div>

            {/* Constraint Alert */}
            <Alert variant="default" className="border-warning bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription>
                <strong className="text-warning">Constraint:</strong> {scenario.constraint}
              </AlertDescription>
            </Alert>

            {/* Twist Alert */}
            <Alert variant="destructive" className="border-destructive/50">
              <Zap className="h-4 w-4" />
              <AlertDescription>
                <strong>Market Twist:</strong> {scenario.twist}
              </AlertDescription>
            </Alert>
          </div>

          {/* Countdown */}
          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground mb-2">Auto-advancing in</p>
            <div className="text-5xl font-bold tabular-nums">{countdown}s</div>
          </div>

          <Button 
            onClick={onComplete} 
            className="w-full"
            size="lg"
          >
            I'm Ready — Start Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
});

IncubatorBriefScreen.displayName = 'IncubatorBriefScreen';
