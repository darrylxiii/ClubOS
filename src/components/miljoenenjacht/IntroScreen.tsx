import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface IntroScreenProps {
  onStart: () => void;
}

export const IntroScreen = memo(({ onStart }: IntroScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background/95 to-primary/5">
      <Card className="max-w-2xl w-full backdrop-blur-xl bg-card/80 border-border/50">
        <CardContent className="p-8 md:p-12 space-y-6">
          <div className="text-center space-y-4">
            <div className="text-6xl md:text-8xl mb-4 animate-pulse">🎁</div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Miljoenenjacht
            </h1>
            <p className="text-xl text-muted-foreground">
              Deal or No Deal: Discover Your Risk Profile
            </p>
          </div>

          <div className="space-y-4 text-foreground/90">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <h3 className="font-semibold mb-2">How It Works</h3>
              <ul className="space-y-2 text-sm">
                <li>• Choose your briefcase - it contains your hidden prize</li>
                <li>• Open other cases to eliminate amounts from the board</li>
                <li>• The Banker will make you cash offers after each round</li>
                <li>• Decide: DEAL (take the money) or NO DEAL (keep playing)</li>
                <li>• Will you play it safe or go for the big prize?</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <h3 className="font-semibold mb-2">What We'll Discover</h3>
              <p className="text-sm text-muted-foreground">
                Through your decisions, we'll analyze your risk tolerance, decision-making style, 
                emotional regulation under pressure, and match you with ideal career paths based 
                on your psychological profile.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center text-sm">
              <div className="p-3 rounded-lg bg-card/50">
                <div className="text-2xl mb-1">⚡</div>
                <div className="font-semibold">10 min</div>
                <div className="text-muted-foreground">Duration</div>
              </div>
              <div className="p-3 rounded-lg bg-card/50">
                <div className="text-2xl mb-1">🎯</div>
                <div className="font-semibold">26 Cases</div>
                <div className="text-muted-foreground">To Explore</div>
              </div>
            </div>
          </div>

          <Button 
            onClick={onStart}
            size="lg"
            className="w-full text-lg h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            Let's Play! 🚀
          </Button>
        </CardContent>
      </Card>
    </div>
  );
});

IntroScreen.displayName = 'IntroScreen';
