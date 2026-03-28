import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumb } from '@/components/Breadcrumb';
import { AssessmentCard } from '@/components/assessments/AssessmentCard';
import { ASSESSMENTS } from '@/data/assessments';

const Assessments = memo(() => {
  const { t } = useTranslation('common');

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Breadcrumb */}
      <Breadcrumb 
        items={[
          { label: t('breadcrumb.home', 'Home'), path: '/home' },
          { label: t('assessments.title', 'Assessments') }
        ]}
      />
      
      {/* Header */}
      <div className="space-y-3 text-center max-w-3xl mx-auto">
        <h1 className="text-5xl font-bold tracking-tight">{t('assessments.title')}</h1>
        <p className="text-lg text-muted-foreground">{t('assessments.desc')}</p>
      </div>

      {/* Assessment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ASSESSMENTS.map((assessment) => (
          <AssessmentCard key={assessment.id} assessment={assessment} />
        ))}
      </div>

      {/* Coming Soon Note */}
      <div className="text-center text-sm text-muted-foreground mt-8">
        {t('assessments.comingSoon', 'More assessments coming soon')}
      </div>
    </div>
  );
});

Assessments.displayName = 'Assessments';

export default Assessments;