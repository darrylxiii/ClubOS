import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BlindSpotResult } from '@/types/assessment';
import { Eye, Lightbulb, AlertTriangle } from 'lucide-react';

interface BlindSpotResultsProps {
  results: BlindSpotResult;
  onBack: () => void;
}

export const BlindSpotResults = memo(({ results, onBack }: BlindSpotResultsProps) => {
  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <div className="text-6xl mb-4 text-center">🔍</div>
          <CardTitle className="text-3xl text-center">Your Self-Awareness Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-3xl font-bold">{Math.round(results.selfAwarenessScore)}%</div>
              <div className="text-sm text-muted-foreground">Self-Awareness Score</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted">
              <div className="text-3xl font-bold">{Math.round(results.coachabilityScore)}%</div>
              <div className="text-sm text-muted-foreground">Coachability</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {results.topBlindSpots.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <CardTitle>Blind Spots</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Skills you may be overestimating
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {results.topBlindSpots.map((spot) => (
                <Badge key={spot} variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-500/30">
                  {spot}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {results.hiddenStrengths.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-green-500" />
              <CardTitle>Hidden Strengths</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              Skills you're undervaluing
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {results.hiddenStrengths.map((strength) => (
                <Badge key={strength} variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                  {strength}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            <CardTitle>Dimension Comparison</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(results.dimensionScores).map(([dimension, scores]) => {
              const gap = scores.self - scores.objective;
              const isBlindSpot = gap > 1.5;
              const isHiddenStrength = gap < -1.5;
              
              return (
                <div key={dimension} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{dimension}</span>
                    <div className="flex gap-2 text-xs">
                      <span className="text-muted-foreground">
                        Self: {scores.self.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">|</span>
                      <span className={isBlindSpot ? 'text-orange-500' : isHiddenStrength ? 'text-green-500' : ''}>
                        Actual: {scores.objective.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 h-2 bg-blue-500/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${(scores.self / 10) * 100}%` }}
                      />
                    </div>
                    <div className="flex-1 h-2 bg-primary/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${(scores.objective / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Button onClick={onBack} className="w-full" size="lg">
        Back to Assessments
      </Button>
    </div>
  );
});

BlindSpotResults.displayName = 'BlindSpotResults';
