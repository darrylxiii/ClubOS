import { memo } from 'react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { AssessmentCard } from '@/components/assessments/AssessmentCard';
import { ASSESSMENTS } from '@/data/assessments';
import { AppLayout } from '@/components/AppLayout';

const Assessments = memo(() => {
  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-8">
        {/* Breadcrumb */}
        <Breadcrumb 
          items={[
            { label: 'Home', path: '/home' },
            { label: 'Assessments' }
          ]}
        />
        
        {/* Header */}
        <div className="space-y-3 text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold tracking-tight">Assessment Center</h1>
          <p className="text-lg text-muted-foreground">
            Discover your strengths and unlock opportunities through our comprehensive assessment suite
          </p>
        </div>

        {/* Assessment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ASSESSMENTS.map((assessment) => (
            <AssessmentCard key={assessment.id} assessment={assessment} />
          ))}
        </div>

        {/* Coming Soon Note */}
        <div className="text-center text-sm text-muted-foreground mt-8">
          More assessments coming soon
        </div>
      </div>
    </AppLayout>
  );
});

Assessments.displayName = 'Assessments';

export default Assessments;
