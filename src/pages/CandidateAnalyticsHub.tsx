import { useTranslation } from 'react-i18next';
import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageLoader } from '@/components/PageLoader';

const CandidateAnalytics = lazy(() => import('@/pages/CandidateAnalytics'));
const SalaryInsights = lazy(() => import('@/pages/SalaryInsights'));
const CareerInsightsDashboard = lazy(() => import('@/pages/CareerInsightsDashboard'));
const CareerPath = lazy(() => import('@/pages/CareerPath'));

const TAB_MAP: Record<string, string> = {
  performance: 'performance',
  salary: 'salary',
  career: 'career',
  'career-path': 'career-path',
};

export default function CandidateAnalyticsHub() {
  const { t } = useTranslation('common');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = TAB_MAP[searchParams.get('tab') || ''] || 'performance';

  const handleTabChange = (value: string) => {
    setSearchParams(value === 'performance' ? {} : { tab: value }, { replace: true });
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">{t("my_analytics", "MY ANALYTICS")}</h1>
        </div>
        <p className="text-muted-foreground">
          Your performance, salary benchmarks, career insights and trajectory
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="h-auto flex-wrap bg-card/50 backdrop-blur-sm rounded-lg p-1">
          <TabsTrigger value="performance">{t("performance", "Performance")}</TabsTrigger>
          <TabsTrigger value="salary">{t("salary_insights", "Salary Insights")}</TabsTrigger>
          <TabsTrigger value="career">{t("career_insights", "Career Insights")}</TabsTrigger>
          <TabsTrigger value="career-path">{t("career_path", "Career Path")}</TabsTrigger>
        </TabsList>

        <Suspense fallback={<PageLoader />}>
          <TabsContent value="performance">
            <CandidateAnalytics />
          </TabsContent>
          <TabsContent value="salary">
            <SalaryInsights />
          </TabsContent>
          <TabsContent value="career">
            <CareerInsightsDashboard />
          </TabsContent>
          <TabsContent value="career-path">
            <CareerPath />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
