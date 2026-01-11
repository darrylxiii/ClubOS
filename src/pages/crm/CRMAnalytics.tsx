import { useState } from "react";
import { motion } from "framer-motion";
import { RoleGate } from "@/components/RoleGate";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CRMReportBuilder } from "@/components/crm/reporting/CRMReportBuilder";
import { AppLayout } from "@/components/AppLayout";
import { CRMAnalyticsSummary } from "@/components/crm/CRMAnalyticsSummary";
import { CRMFunnelVisualization } from "@/components/crm/CRMFunnelVisualization";
import { CRMCohortAnalysis } from "@/components/crm/CRMCohortAnalysis";
import { CRMTeamLeaderboard } from "@/components/crm/CRMTeamLeaderboard";
import { CRMReportExporter } from "@/components/crm/CRMReportExporter";
import { BarChart3 } from "lucide-react";

type DateRangeType = 'week' | 'month' | '3months' | '6months' | 'year';

export default function CRMAnalytics() {
  const [dateRange, setDateRange] = useState<DateRangeType>('month');

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                CRM Analytics
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Pipeline performance and team metrics
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeType)}>
                <TabsList className="bg-muted/50">
                  <TabsTrigger value="week" className="text-xs">Week</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs">Month</TabsTrigger>
                  <TabsTrigger value="3months" className="text-xs">3 Months</TabsTrigger>
                  <TabsTrigger value="year" className="text-xs">Year</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </motion.div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="custom_reports">Custom Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <CRMAnalyticsSummary dateRange={dateRange} />

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

            <TabsContent value="custom_reports">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Report Builder</h3>
                    <p className="text-sm text-muted-foreground">Create custom visualizations from your CRM data</p>
                  </div>
                </div>
                <CRMReportBuilder />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
