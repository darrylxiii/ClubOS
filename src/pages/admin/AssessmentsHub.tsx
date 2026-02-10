import { memo, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AssessmentOverviewTab } from '@/components/admin/assessments/AssessmentOverviewTab';
import { SendAssessmentsTab } from '@/components/admin/assessments/SendAssessmentsTab';
import { ResultsDashboardTab } from '@/components/admin/assessments/ResultsDashboardTab';
import { CustomAssessmentsTab } from '@/components/admin/assessments/CustomAssessmentsTab';
import { AssignmentTrackingTab } from '@/components/admin/assessments/AssignmentTrackingTab';

const AssessmentsHub = memo(() => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        <Breadcrumb
          items={[
            { label: 'Admin', path: '/admin' },
            { label: 'Assessments Hub' },
          ]}
        />

        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Assessments Hub</h1>
          <p className="text-muted-foreground">
            Manage, send, and analyze assessments across your talent pool
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="send">Send Assessments</TabsTrigger>
            <TabsTrigger value="results">Results Dashboard</TabsTrigger>
            <TabsTrigger value="custom">Custom Assessments</TabsTrigger>
            <TabsTrigger value="tracking">Assignment Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AssessmentOverviewTab />
          </TabsContent>

          <TabsContent value="send">
            <SendAssessmentsTab />
          </TabsContent>

          <TabsContent value="results">
            <ResultsDashboardTab />
          </TabsContent>

          <TabsContent value="custom">
            <CustomAssessmentsTab />
          </TabsContent>

          <TabsContent value="tracking">
            <AssignmentTrackingTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
});

AssessmentsHub.displayName = 'AssessmentsHub';

export default AssessmentsHub;
