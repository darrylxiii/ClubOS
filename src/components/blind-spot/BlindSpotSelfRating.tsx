import { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { BlindSpotDimension, BlindSpotSelfRating as SelfRating } from '@/types/assessment';
import { Badge } from '@/components/ui/badge';

interface BlindSpotSelfRatingProps {
  dimensions: BlindSpotDimension[];
  session: any;
  onComplete: () => void;
}

export const BlindSpotSelfRating = memo(({ dimensions, session, onComplete }: BlindSpotSelfRatingProps) => {
  const [ratings, setRatings] = useState<{ [key: string]: SelfRating }>({});

  const handleRatingChange = (dimensionId: string, value: number) => {
    setRatings(prev => ({
      ...prev,
      [dimensionId]: {
        dimensionId,
        selfRating: value,
        confidence: prev[dimensionId]?.confidence || 3
      }
    }));
  };

  const handleConfidenceChange = (dimensionId: string, value: number) => {
    setRatings(prev => ({
      ...prev,
      [dimensionId]: {
        ...prev[dimensionId],
        dimensionId,
        selfRating: prev[dimensionId]?.selfRating || 5,
        confidence: value
      }
    }));
  };

  const handleSubmit = async () => {
    const ratingsList = Object.values(ratings);
    await session.saveSelfRatings(ratingsList);
    onComplete();
  };

  const progress = (Object.keys(ratings).length / dimensions.length) * 100;
  const isComplete = Object.keys(ratings).length === dimensions.length;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'technical': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
      case 'soft_skill': return 'bg-green-500/10 text-green-500 border-green-500/30';
      case 'work_habit': return 'bg-purple-500/10 text-purple-500 border-purple-500/30';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rate Yourself</CardTitle>
          <p className="text-sm text-muted-foreground">
            How would you rate your abilities in these areas? Be honest!
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>{Object.keys(ratings).length} of {dimensions.length} rated</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {dimensions.map((dimension) => {
          const rating = ratings[dimension.id];
          return (
            <Card key={dimension.id}>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{dimension.name}</h3>
                      <Badge variant="outline" className={getCategoryColor(dimension.category)}>
                        {dimension.category.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{dimension.description}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Your Rating</span>
                      <span className="font-bold">
                        {rating?.selfRating || 5}/10
                      </span>
                    </div>
                    <Slider
                      value={[rating?.selfRating || 5]}
                      onValueChange={(value) => handleRatingChange(dimension.id, value[0])}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Beginner</span>
                      <span>Expert</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Confidence in Rating</span>
                      <span className="font-bold">
                        {rating?.confidence || 3}/5
                      </span>
                    </div>
                    <Slider
                      value={[rating?.confidence || 3]}
                      onValueChange={(value) => handleConfidenceChange(dimension.id, value[0])}
                      min={1}
                      max={5}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Unsure</span>
                      <span>Very Sure</span>
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
        disabled={!isComplete}
      >
        Continue to Scenarios
      </Button>
    </div>
  );
});

BlindSpotSelfRating.displayName = 'BlindSpotSelfRating';
