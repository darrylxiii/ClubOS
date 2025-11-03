import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, Lightbulb, TrendingUp } from 'lucide-react';

interface BlindSpotIntroProps {
  onStart: () => void;
}

export const BlindSpotIntro = memo(({ onStart }: BlindSpotIntroProps) => {
  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Card>
        <CardHeader>
          <div className="text-6xl mb-4 text-center">🔍</div>
          <CardTitle className="text-3xl text-center">Blind Spot Detector</CardTitle>
          <p className="text-center text-muted-foreground mt-2">
            Discover the gap between self-perception and reality
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Eye className="h-4 w-4" />
            <AlertDescription>
              Compare how you see yourself with objective behavioral measurements to uncover blind spots and hidden strengths.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              How It Works
            </h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</span>
                <p><strong>Self-Rate:</strong> Evaluate yourself on 10 key dimensions</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</span>
                <p><strong>Scenarios:</strong> Make decisions in 10 realistic situations</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">3</span>
                <p><strong>Compare:</strong> See where perception meets reality</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              What You'll Learn
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">Blind Spots</div>
                <div className="text-xs text-muted-foreground">Skills you overestimate</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">Hidden Strengths</div>
                <div className="text-xs text-muted-foreground">Skills you undervalue</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">Self-Awareness</div>
                <div className="text-xs text-muted-foreground">Overall accuracy score</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">Coachability</div>
                <div className="text-xs text-muted-foreground">Growth potential indicator</div>
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

BlindSpotIntro.displayName = 'BlindSpotIntro';
