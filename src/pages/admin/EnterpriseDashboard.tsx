import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';
import { Shield, Clock, Palette, FileCheck, Building2 } from 'lucide-react';
import { SLADashboard } from '@/components/admin/enterprise/SLADashboard';
import { WhiteLabelManager } from '@/components/admin/enterprise/WhiteLabelManager';
import { ComplianceDashboard } from '@/components/admin/ComplianceDashboard';
import { DisasterRecoveryDashboard } from '@/components/admin/DisasterRecoveryDashboard';

export default function EnterpriseDashboard() {
  const { t } = useTranslation('admin');
  return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('enterpriseDashboard.text2')}</h1>
            <p className="text-muted-foreground">{t('enterpriseDashboard.desc')}</p>
          </div>
          <Building2 className="h-12 w-12 text-primary" />
        </div>

        <Tabs defaultValue="compliance" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="compliance" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="sla" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              SLA
            </TabsTrigger>
            <TabsTrigger value="dr" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              DR
            </TabsTrigger>
            <TabsTrigger value="whitelabel" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              White Label
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compliance">
            <ComplianceDashboard />
          </TabsContent>

          <TabsContent value="sla">
            <SLADashboard />
          </TabsContent>

          <TabsContent value="dr">
            <DisasterRecoveryDashboard />
          </TabsContent>

          <TabsContent value="whitelabel">
            <WhiteLabelManager />
          </TabsContent>
        </Tabs>
      </div>
  );
}
