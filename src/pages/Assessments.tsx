import { memo } from 'react';
import { AssessmentCard } from '@/components/assessments/AssessmentCard';
import { ASSESSMENTS } from '@/data/assessments';
import { AppLayout } from '@/components/AppLayout';

const Assessments = memo(() => {
  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="space-y-3 text-center max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold">Assessments</h1>
          <p className="text-lg text-muted-foreground">
            Discover your strengths, personality, and ideal job matches through our curated assessments.
          </p>
        </div>

        {/* Assessment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ASSESSMENTS.map((assessment) => (
            <AssessmentCard key={assessment.id} assessment={assessment} />
          ))}
        </div>

        {/* Coming Soon Note */}
        <div className="text-center text-sm text-muted-foreground">
          More assessments coming soon! 🚀
        </div>
      </div>
    </AppLayout>
  );
});

Assessments.displayName = 'Assessments';

export default Assessments;
