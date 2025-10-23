import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowRight, ArrowLeft, ArrowDown } from 'lucide-react';
import { SWIPE_ACTIONS } from '@/data/assessments';

interface InstructionsPageProps {
  onStart: () => void;
}

export const InstructionsPage = memo(({ onStart }: InstructionsPageProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-background/80">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">How to Play</h1>
            <p className="text-muted-foreground">
              Swipe through 50 scenarios to discover your work personality
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { Icon: ArrowUp, ...SWIPE_ACTIONS[0] },
              { Icon: ArrowRight, ...SWIPE_ACTIONS[1] },
              { Icon: ArrowLeft, ...SWIPE_ACTIONS[2] },
              { Icon: ArrowDown, ...SWIPE_ACTIONS[3] },
            ].map(({ Icon, label, points, color }) => (
              <div
                key={label}
                className="flex items-center gap-3 p-4 rounded-lg border border-border/20 bg-card/30 backdrop-blur-sm"
              >
                <Icon className={`h-6 w-6 ${color}`} />
                <div className="flex-1">
                  <div className="font-medium">{label}</div>
                  <div className="text-sm text-muted-foreground">
                    {points > 0 ? '+' : ''}{points} points
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card/40 backdrop-blur-sm rounded-lg p-6 border border-border/20">
            <h3 className="font-semibold mb-3">💡 Pro Tips</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Be honest - there are no wrong answers</li>
              <li>• Go with your gut feeling</li>
              <li>• You can skip scenarios if needed</li>
              <li>• Takes about 5 minutes to complete</li>
            </ul>
          </div>

          <Button onClick={onStart} size="lg" className="w-full">
            Got it, let's go! 🚀
          </Button>
        </CardContent>
      </Card>
    </div>
  );
});

InstructionsPage.displayName = 'InstructionsPage';
