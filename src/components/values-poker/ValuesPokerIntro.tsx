import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Coins, Scale, Target } from 'lucide-react';

interface ValuesPokerIntroProps {
  onStart: () => void;
}

export const ValuesPokerIntro = memo(({ onStart }: ValuesPokerIntroProps) => {
  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Card>
        <CardHeader>
          <div className="text-6xl mb-4 text-center">🎲</div>
          <CardTitle className="text-3xl text-center">Values Poker</CardTitle>
          <p className="text-center text-muted-foreground mt-2">
            Discover what truly motivates you at work
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Coins className="h-4 w-4" />
            <AlertDescription>
              Allocate 100 points across work values, then make trade-offs in realistic scenarios. We'll compare what you say matters vs. what you actually choose.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Scale className="h-5 w-5" />
              How It Works
            </h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</span>
                <p><strong>Allocate Points:</strong> Distribute 100 points across 10 work values</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</span>
                <p><strong>Make Trade-offs:</strong> Choose between 20 realistic job scenarios</p>
              </div>
              <div className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">3</span>
                <p><strong>Reveal Truth:</strong> See if your actions match your words</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="h-5 w-5" />
              What You'll Discover
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">Your Archetype</div>
                <div className="text-xs text-muted-foreground">Core motivation profile</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">Consistency</div>
                <div className="text-xs text-muted-foreground">Do you walk your talk?</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">Culture Fit</div>
                <div className="text-xs text-muted-foreground">Which companies match</div>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <div className="font-medium">Trade-off Patterns</div>
                <div className="text-xs text-muted-foreground">What you'll sacrifice</div>
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

ValuesPokerIntro.displayName = 'ValuesPokerIntro';
