import { memo, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { LOADING_FACTS } from '@/data/assessments';

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen = memo(({ onComplete }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(progressInterval);
  }, [onComplete]);

  useEffect(() => {
    const factInterval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % LOADING_FACTS.length);
    }, 1500);

    return () => clearInterval(factInterval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-background/80">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 space-y-6 text-center">
          <div className="text-6xl animate-pulse">🧠</div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Analyzing Your Personality...</h2>
            <p className="text-muted-foreground min-h-[3rem] flex items-center justify-center">
              {LOADING_FACTS[factIndex]}
            </p>
          </div>

          <Progress value={progress} className="h-2" />
          
          <p className="text-sm text-muted-foreground">
            {progress}% Complete
          </p>
        </CardContent>
      </Card>
    </div>
  );
});

LoadingScreen.displayName = 'LoadingScreen';
