import { useEmployeePipelineValue } from '@/hooks/useEmployeePipelineValue';
import { useEmployeeGamification } from '@/hooks/useEmployeeGamification';
import { PotentialEarningsCard } from './PotentialEarningsCard';
import { RecruiterLevelCard } from './RecruiterLevelCard';
import { TopPipelineDeals } from './TopPipelineDeals';
import { EarningsFunnelVisualization } from './EarningsFunnelVisualization';

export function EarningsTab() {
  const { data: pipeline, isLoading: pipelineLoading } = useEmployeePipelineValue();
  const { data: gamification, isLoading: gamificationLoading } = useEmployeeGamification();

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PotentialEarningsCard
            weightedValue={pipeline?.weightedPipelineValue || 0}
            rawValue={pipeline?.rawPipelineValue || 0}
            realizedRevenue={pipeline?.realizedRevenue || 0}
            isLoading={pipelineLoading}
          />
        </div>
        <div>
          <RecruiterLevelCard
            currentLevel={gamification?.currentLevel || 'Scout'}
            totalXp={gamification?.totalXp || 0}
            levelProgress={gamification?.levelProgress || 0}
            xpToNextLevel={gamification?.xpToNextLevel || 500}
            currentStreak={gamification?.currentStreak || 0}
            isLoading={gamificationLoading}
          />
        </div>
      </div>

      {/* Funnel & Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EarningsFunnelVisualization
          stageBreakdown={pipeline?.stageBreakdown || []}
          isLoading={pipelineLoading}
        />
        <TopPipelineDeals
          deals={pipeline?.topDeals || []}
          isLoading={pipelineLoading}
        />
      </div>
    </div>
  );
}
