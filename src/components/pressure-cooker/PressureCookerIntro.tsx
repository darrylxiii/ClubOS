import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertCircle, Target } from 'lucide-react';

interface PressureCookerIntroProps {
  scenario: {
    name: string;
    description: string;
  };
  onStart: () => void;
}

export const PressureCookerIntro = memo(({ scenario, onStart }: PressureCookerIntroProps) => {
  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Card>
        <CardHeader>
          <div className="text-6xl mb-4 text-center">🔥</div>
          <CardTitle className="text-3xl text-center">Pressure Cooker Assessment</CardTitle>
          <p className="text-center text-muted-foreground mt-2">
            {scenario.name}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {scenario.description}
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="h-5 w-5" />
              How It Works
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Tasks will arrive throughout the 15-minute assessment</li>
              <li>• Prioritize what matters most: urgency, impact, and deadlines</li>
              <li>• Choose to Complete, Delegate, Defer, Skip, or Escalate each task</li>
              <li>• We'll measure your prioritization accuracy and stress handling</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5" />
              What We Measure
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">Prioritization</div>
                <div className="text-xs text-muted-foreground">Task ordering accuracy</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">Stress Handling</div>
                <div className="text-xs text-muted-foreground">Performance under pressure</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">Multitasking</div>
                <div className="text-xs text-muted-foreground">Action variety and flow</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">Communication</div>
                <div className="text-xs text-muted-foreground">Delegation style</div>
              </div>
            </div>
          </div>

          <Button onClick={onStart} className="w-full" size="lg">
            Start Assessment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
});

PressureCookerIntro.displayName = 'PressureCookerIntro';
