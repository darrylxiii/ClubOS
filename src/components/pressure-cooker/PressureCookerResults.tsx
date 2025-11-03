import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { PressureCookerResult } from '@/types/assessment';
import { TrendingUp, Target, Zap, Brain, MessageSquare } from 'lucide-react';

interface PressureCookerResultsProps {
  results: PressureCookerResult;
  onBack: () => void;
}

export const PressureCookerResults = memo(({ results, onBack }: PressureCookerResultsProps) => {
  const metrics = [
    { icon: TrendingUp, label: 'Completion Rate', value: results.completionRate, color: 'text-green-500' },
    { icon: Target, label: 'Prioritization', value: results.prioritizationAccuracy, color: 'text-blue-500' },
    { icon: Zap, label: 'Stress Handling', value: results.stressHandling, color: 'text-orange-500' },
    { icon: Brain, label: 'Multitasking', value: results.multitaskingAbility, color: 'text-purple-500' },
  ];

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <div className="text-6xl mb-4 text-center">🏆</div>
          <CardTitle className="text-3xl text-center">Assessment Complete!</CardTitle>
          <p className="text-center text-muted-foreground">
            You completed {results.tasksCompleted} of {results.totalTasks} tasks
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
                <CardTitle className="text-base">{metric.label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-3xl font-bold">{Math.round(metric.value)}%</div>
                <Progress value={metric.value} className="h-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <CardTitle>Communication Style</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Badge variant="outline" className="text-lg px-4 py-2">
            {results.communicationStyle}
          </Badge>
          <p className="text-sm text-muted-foreground mt-3">
            Your approach to delegation and task communication
          </p>
        </CardContent>
      </Card>

      {results.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {results.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Button onClick={onBack} className="w-full" size="lg">
        Back to Assessments
      </Button>
    </div>
  );
});

PressureCookerResults.displayName = 'PressureCookerResults';
