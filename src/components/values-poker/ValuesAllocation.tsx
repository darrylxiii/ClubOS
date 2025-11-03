import { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { WorkValue, ValueAllocation as AllocationData } from '@/types/assessment';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface ValuesAllocationProps {
  values: WorkValue[];
  session: any;
  onComplete: () => void;
}

export const ValuesAllocation = memo(({ values, session, onComplete }: ValuesAllocationProps) => {
  const [allocations, setAllocations] = useState<{ [key: string]: number }>(
    Object.fromEntries(values.map(v => [v.id, 10]))
  );

  const totalPoints = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  const remaining = 100 - totalPoints;

  const handleAllocationChange = (valueId: string, newValue: number) => {
    setAllocations(prev => ({
      ...prev,
      [valueId]: newValue
    }));
  };

  const handleSubmit = async () => {
    const allocationsList: AllocationData[] = values.map(v => ({
      valueId: v.id,
      points: allocations[v.id] || 0
    }));
    
    await session.saveStatedPriorities(allocationsList);
    onComplete();
  };

  const isValid = totalPoints === 100;

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Allocate Your 100 Points</CardTitle>
          <p className="text-sm text-muted-foreground">
            Distribute points to reflect what truly matters to you in your career
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>Points Allocated</span>
              <span className={remaining === 0 ? 'text-green-500 font-bold' : remaining < 0 ? 'text-red-500 font-bold' : 'font-bold'}>
                {totalPoints} / 100
              </span>
            </div>
            <Progress value={Math.min(totalPoints, 100)} className="h-2" />
            {remaining !== 0 && (
              <Alert variant={remaining < 0 ? 'destructive' : 'default'}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {remaining > 0 ? `${remaining} points remaining` : `${Math.abs(remaining)} points over budget!`}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {values.map((value) => {
          const points = allocations[value.id] || 0;
          return (
            <Card key={value.id}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{value.emoji}</span>
                        <h3 className="font-semibold">{value.name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{value.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{points}</div>
                      <div className="text-xs text-muted-foreground">points</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Slider
                      value={[points]}
                      onValueChange={(newValue) => handleAllocationChange(value.id, newValue[0])}
                      min={0}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0 points</span>
                      <span>50 points</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button 
        onClick={handleSubmit} 
        className="w-full" 
        size="lg"
        disabled={!isValid}
      >
        Continue to Trade-offs
      </Button>
    </div>
  );
});

ValuesAllocation.displayName = 'ValuesAllocation';
