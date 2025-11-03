import { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ValueTradeoffScenario } from '@/types/assessment';
import { ArrowRight } from 'lucide-react';

interface ValuesTradeoffsProps {
  scenarios: ValueTradeoffScenario[];
  session: any;
  onComplete: () => void;
}

export const ValuesTradeoffs = memo(({ scenarios, session, onComplete }: ValuesTradeoffsProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime, setStartTime] = useState(Date.now());

  const currentScenario = scenarios[currentIndex];
  const progress = ((currentIndex + 1) / scenarios.length) * 100;

  const handleChoice = async (choice: 'A' | 'B') => {
    const timeSpent = Date.now() - startTime;
    await session.addTradeoffResponse(currentScenario.id, choice, timeSpent);

    if (currentIndex < scenarios.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setStartTime(Date.now());
    } else {
      onComplete();
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Trade-off {currentIndex + 1} of {scenarios.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{currentScenario.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground text-lg">{currentScenario.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => handleChoice('A')}
              variant="outline"
              className="h-auto p-6 flex flex-col items-start gap-3 hover:border-primary hover:bg-primary/5 transition-all whitespace-normal"
            >
              <div className="flex items-center gap-2 w-full">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  A
                </span>
                <span className="font-semibold text-left">Option A</span>
              </div>
              <p className="text-sm text-muted-foreground text-left w-full break-words whitespace-normal">
                {currentScenario.optionA.text}
              </p>
              <ArrowRight className="h-5 w-5 ml-auto text-primary flex-shrink-0" />
            </Button>

            <Button
              onClick={() => handleChoice('B')}
              variant="outline"
              className="h-auto p-6 flex flex-col items-start gap-3 hover:border-primary hover:bg-primary/5 transition-all whitespace-normal"
            >
              <div className="flex items-center gap-2 w-full">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  B
                </span>
                <span className="font-semibold text-left">Option B</span>
              </div>
              <p className="text-sm text-muted-foreground text-left w-full break-words whitespace-normal">
                {currentScenario.optionB.text}
              </p>
              <ArrowRight className="h-5 w-5 ml-auto text-primary flex-shrink-0" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

ValuesTradeoffs.displayName = 'ValuesTradeoffs';
