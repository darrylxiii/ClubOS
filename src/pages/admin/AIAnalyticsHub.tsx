import { lazy, Suspense, useState } from 'react';
import { Brain } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageLoader } from '@/components/PageLoader';
import { useSearchParams } from 'react-router-dom';

const RAGAnalyticsDashboard = lazy(() => import('@/pages/admin/RAGAnalyticsDashboard'));
const EnhancedMLDashboard = lazy(() => import('@/pages/EnhancedMLDashboard'));

export default function AIAnalyticsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'rag';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold uppercase tracking-wider">AI Analytics</h1>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <div className="overflow-x-auto">
          <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-2 sm:w-full h-auto bg-card/50 backdrop-blur-sm rounded-lg p-1">
            <TabsTrigger value="rag">RAG Analytics</TabsTrigger>
            <TabsTrigger value="ml">ML Dashboard</TabsTrigger>
          </TabsList>
        </div>

        <Suspense fallback={<PageLoader />}>
          <TabsContent value="rag">
            <RAGAnalyticsDashboard />
          </TabsContent>
          <TabsContent value="ml">
            <EnhancedMLDashboard />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
