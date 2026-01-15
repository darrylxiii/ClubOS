import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ValuesPokerResult } from '@/types/assessment';
import { Award, Building, AlertTriangle } from 'lucide-react';
import { WORK_VALUES } from '@/data/valuesPokerData';

interface ValuesPokerResultsProps {
  results: ValuesPokerResult;
  onBack: () => void;
}

export const ValuesPokerResults = memo(({ results, onBack }: ValuesPokerResultsProps) => {
  const getValueEmoji = (valueId: string) => {
    return WORK_VALUES.find(v => v.id === valueId)?.emoji || '⭐';
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <div className="text-6xl mb-4 text-center">🎲</div>
          <CardTitle className="text-3xl text-center">Your Values Profile</CardTitle>
          <p className="text-center text-muted-foreground">
            {results.archetype}
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center p-4 rounded-lg bg-muted">
            <div className="text-4xl font-bold">{Math.round(results.consistencyScore)}%</div>
            <div className="text-sm text-muted-foreground">Consistency Score</div>
            <p className="text-xs text-muted-foreground mt-2">
              How well your stated values match your choices
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            <CardTitle>Your Top Values</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {results.topValues.map((valueName, idx) => {
              const statedValue = results.statedPriorities.find(sp => {
                const value = WORK_VALUES.find(v => v.name === valueName);
                return value && sp.valueId === value.id;
              });
              const revealedValue = results.revealedPriorities.find(rp => {
                const value = WORK_VALUES.find(v => v.name === valueName);
                return value && rp.valueId === value.id;
              });
              const valueObj = WORK_VALUES.find(v => v.name === valueName);

              return (
                <div key={valueName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{valueObj?.emoji}</span>
                      <div>
                        <div className="font-semibold">#{idx + 1} {valueName}</div>
                        <div className="text-xs text-muted-foreground">
                          Stated: {Math.round(statedValue?.points || 0)}% • Revealed: {Math.round(revealedValue?.points || 0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Progress value={statedValue?.points || 0} className="h-2" />
                    <Progress value={revealedValue?.points || 0} className="h-2" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            <CardTitle>Culture Fit Scores</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(results.cultureFitScores)
              .sort(([, a], [, b]) => b - a)
              .map(([company, score]) => (
                <div key={company} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{company}</span>
                    <span className="text-muted-foreground">{Math.round(score)}% match</span>
                  </div>
                  <Progress value={score} className="h-2" />
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {results.redFlags.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <CardTitle>Inconsistencies Worth Noting</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {results.redFlags.map((flag, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-orange-500 mt-0.5">⚠️</span>
                  <span>{flag}</span>
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

ValuesPokerResults.displayName = 'ValuesPokerResults';
