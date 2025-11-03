import { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BlindSpotScenario } from '@/types/assessment';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface BlindSpotScenariosProps {
  scenarios: BlindSpotScenario[];
  session: any;
  onComplete: () => void;
}

export const BlindSpotScenarios = memo(({ scenarios, session, onComplete }: BlindSpotScenariosProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [startTime, setStartTime] = useState(Date.now());

  const currentScenario = scenarios[currentIndex];
  const progress = ((currentIndex + 1) / scenarios.length) * 100;

  const handleNext = async () => {
    if (!selectedChoice) return;

    const timeSpent = Date.now() - startTime;
    await session.addScenarioResponse(currentScenario.id, selectedChoice, timeSpent);

    if (currentIndex < scenarios.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedChoice(null);
      setStartTime(Date.now());
    } else {
      onComplete();
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Scenario {currentIndex + 1} of {scenarios.length}</span>
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
          <p className="text-muted-foreground">{currentScenario.description}</p>

          <RadioGroup value={selectedChoice || ''} onValueChange={setSelectedChoice}>
            <div className="space-y-3">
              {currentScenario.choices.map((choice) => (
                <div
                  key={choice.id}
                  className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                    selectedChoice === choice.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedChoice(choice.id)}
                >
                  <RadioGroupItem value={choice.id} id={choice.id} className="mt-1" />
                  <Label htmlFor={choice.id} className="cursor-pointer flex-1">
                    {choice.text}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>

          <Button 
            onClick={handleNext}
            disabled={!selectedChoice}
            className="w-full"
            size="lg"
          >
            {currentIndex < scenarios.length - 1 ? 'Next Scenario' : 'Finish Assessment'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
});

BlindSpotScenarios.displayName = 'BlindSpotScenarios';
