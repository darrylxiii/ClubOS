
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, FolderOpen, Cpu, FileText, TrendingUp, Shield, Fuel, Sparkles, Activity } from 'lucide-react';
import { MetricsOverviewDashboard } from '@/components/admin/due-diligence/MetricsOverviewDashboard';
import { DataRoomManager } from '@/components/admin/due-diligence/DataRoomManager';
import { TechStackDocumentation } from '@/components/admin/due-diligence/TechStackDocumentation';
import { RunwayCalculator } from '@/components/financial/RunwayCalculator';
import { TransactionReadinessScore } from '@/components/financial/TransactionReadinessScore';
import { PredictiveRevenueModel } from '@/components/financial/PredictiveRevenueModel';
import { InvestorPDFExport } from '@/components/investor/InvestorPDFExport';
import { EBITDACard } from '@/components/financial/EBITDACard';
import { RevenueConcentrationCard } from '@/components/financial/RevenueConcentrationCard';
import { MultiYearPLTable } from '@/components/financial/MultiYearPLTable';
import { LiveARRTicker } from '@/components/financial/LiveARRTicker';
import { ClientHealthMatrix } from '@/components/financial/ClientHealthMatrix';
import { PlacementVelocity } from '@/components/financial/PlacementVelocity';
import { RevenueWaterfallChart } from '@/components/financial/RevenueWaterfallChart';
import { QuinFinancialCommentary } from '@/components/financial/QuinFinancialCommentary';

export default function DueDiligenceDashboard() {
  return (
    <>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Due Diligence Center</h1>
            <p className="text-muted-foreground">
              Investor-ready metrics, documentation, and data room
            </p>
          </div>
          <div className="flex items-center gap-2">
            <InvestorPDFExport />
            <FileText className="h-12 w-12 text-primary" />
          </div>
        </div>

        <Tabs defaultValue="metrics" className="space-y-4">
          <TabsList className="grid grid-cols-8 w-full max-w-4xl">
            <TabsTrigger value="metrics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Metrics
            </TabsTrigger>
            <TabsTrigger value="narrative" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Narrative
            </TabsTrigger>
            <TabsTrigger value="projections" className="flex items-center gap-2">
              <Fuel className="h-4 w-4" />
              Projections
            </TabsTrigger>
            <TabsTrigger value="readiness" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Readiness
            </TabsTrigger>
            <TabsTrigger value="live" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Live Portal
            </TabsTrigger>
            <TabsTrigger value="commentary" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Commentary
            </TabsTrigger>
            <TabsTrigger value="dataroom" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Data Room
            </TabsTrigger>
            <TabsTrigger value="tech" className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Tech Stack
            </TabsTrigger>
          </TabsList>

          <TabsContent value="metrics">
            <MetricsOverviewDashboard />
          </TabsContent>

          <TabsContent value="narrative" className="space-y-6">
            <MultiYearPLTable />
            <div className="grid gap-6 md:grid-cols-2">
              <EBITDACard year={new Date().getFullYear()} />
              <RevenueConcentrationCard year={new Date().getFullYear()} />
            </div>
          </TabsContent>

          <TabsContent value="projections" className="space-y-6">
            <PredictiveRevenueModel />
            <RunwayCalculator />
          </TabsContent>

          <TabsContent value="readiness">
            <TransactionReadinessScore />
          </TabsContent>

          <TabsContent value="live" className="space-y-6">
            <LiveARRTicker />
            <RevenueWaterfallChart />
            <div className="grid gap-6 md:grid-cols-2">
              <ClientHealthMatrix />
              <PlacementVelocity />
            </div>
          </TabsContent>

          <TabsContent value="commentary">
            <QuinFinancialCommentary />
          </TabsContent>

          <TabsContent value="dataroom">
            <DataRoomManager />
          </TabsContent>

          <TabsContent value="tech">
            <TechStackDocumentation />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
