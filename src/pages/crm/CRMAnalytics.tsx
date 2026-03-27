import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CRMAnalyticsSummary } from "@/components/crm/CRMAnalyticsSummary";
import { CRMFunnelVisualization } from "@/components/crm/CRMFunnelVisualization";
import { CRMCohortAnalysis } from "@/components/crm/CRMCohortAnalysis";
import { CRMTeamLeaderboard } from "@/components/crm/CRMTeamLeaderboard";
import { CRMReportExporter } from "@/components/crm/CRMReportExporter";
import { CopyPerformancePanel } from "@/components/crm/CopyPerformancePanel";
import { BarChart3, Trophy } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";

type DateRangeType = 'week' | 'month' | '3months' | '6months' | 'year';

export default function CRMAnalytics() {
  const { t } = useTranslation('common');
  const [dateRange, setDateRange] = useState<DateRangeType>('month');
  const [activeTab, setActiveTab] = useState('pipeline');

  return (
    <RoleGate allowedRoles={['admin', 'strategist']}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              CRM Analytics & Learnings
            </h1>
            <p className="text-muted-foreground text-sm mt-1">{t('cRMAnalytics.desc')}</p>
          </div>

          <div className="flex items-center gap-3">
            <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeType)}>
              <TabsList className="bg-muted/50">
                <TabsTrigger value="week" className="text-xs">{t('cRMAnalytics.text2')}</TabsTrigger>
                <TabsTrigger value="month" className="text-xs">{t('cRMAnalytics.text3')}</TabsTrigger>
                <TabsTrigger value="3months" className="text-xs">{"3 Months"}</TabsTrigger>
                <TabsTrigger value="year" className="text-xs">{t('cRMAnalytics.text4')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </motion.div>

        {/* Summary Stats */}
        <CRMAnalyticsSummary dateRange={dateRange} />

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="pipeline" className="gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="copy-performance" className="gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              Copy Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <CRMFunnelVisualization dateRange={dateRange} />
                <CRMCohortAnalysis dateRange={dateRange} />
              </div>
              <div className="space-y-6">
                <CRMTeamLeaderboard dateRange={dateRange} />
                <CRMReportExporter />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="copy-performance" className="mt-6">
            <CopyPerformancePanel />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGate>
  );
}
