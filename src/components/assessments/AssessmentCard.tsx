import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { Assessment } from '@/types/assessment';
import { useAuth } from '@/contexts/AuthContext';
import { trackAssessmentInteraction } from '@/services/sessionTracking';

interface AssessmentCardProps {
  assessment: Assessment;
}

export const AssessmentCard = memo(({ assessment }: AssessmentCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleStart = () => {
    if (user) {
      trackAssessmentInteraction(user.id, assessment.id, 'start');
    }
    navigate(assessment.route);
  };

  return (
    <Card className="group cursor-pointer">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="text-5xl mb-2">{assessment.icon}</div>
          <Badge variant="outline" className="capitalize">
            {assessment.category}
          </Badge>
        </div>
        <CardTitle className="text-xl">{assessment.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {assessment.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{assessment.estimatedTime} min</span>
          </div>
          <Button
            onClick={handleStart}
            disabled={!assessment.isActive}
          >
            {assessment.isActive ? 'Start Test' : 'Coming Soon'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

AssessmentCard.displayName = 'AssessmentCard';
