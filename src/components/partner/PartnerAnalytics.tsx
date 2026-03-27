import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { DynamicChart } from "@/components/charts/DynamicChart";
import { KineticNumber } from "@/components/ui/kinetic-number";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { TrendingUp, Users, Clock, Target } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { motion, Variants } from "framer-motion";

interface PartnerAnalyticsProps {
  companyId: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 }
  }
};

export const PartnerAnalytics = ({ companyId }: PartnerAnalyticsProps) => {
  const { t } = useTranslation('partner');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>({
    pipelineHealth: [],
    conversionRates: [],
    timeInStage: [],
    overview: {
      totalCandidates: 0,
      activeJobs: 0,
      avgTimeToHire: 0,
      offerAcceptanceRate: 0,
    }
  });

  useEffect(() => {
    fetchAnalytics();
  }, [companyId]);

  const fetchAnalytics = async () => {
    try {
      // Fetch jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, pipeline_stages, status')
        .eq('company_id', companyId);

      // Fetch applications with created_at
      const jobIds = jobs?.map(j => j.id) || [];
      const { data: applications } = await supabase
        .from('applications')
        .select('id, job_id, status, applied_at, current_stage_index, stages, created_at, updated_at')
        .in('job_id', jobIds);

      // Parse pipeline stages from first job
      const firstJobStages = jobs?.[0]?.pipeline_stages as any;
      const stages = Array.isArray(firstJobStages) ? firstJobStages : [];

      // Calculate avgTimeToHire from hired applications
      const hiredApps = applications?.filter((a: any) => a.status === 'hired') || [];
      let avgTimeToHire = 0;
      
      if (hiredApps.length > 0) {
        const totalDays = hiredApps.reduce((sum: number, app: any) => {
          const appliedDate = new Date(app.applied_at || app.created_at);
          const hiredDate = new Date(app.updated_at);
          const days = Math.max(0, Math.ceil((hiredDate.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24)));
          return sum + days;
        }, 0);
        avgTimeToHire = Math.round(totalDays / hiredApps.length);
      }

      // Calculate offer acceptance rate
      const offeredApps = applications?.filter((a: any) => 
        a.status === 'offered' || a.status === 'hired'
      ) || [];
      const acceptedApps = hiredApps.length;
      const offerAcceptanceRate = offeredApps.length > 0 
        ? Math.round((acceptedApps / offeredApps.length) * 100) 
        : 0;

      // Calculate pipeline health
      const pipelineHealth = stages.map((stage: any) => ({
        name: stage.name,
        count: applications?.filter((a: any) => a.current_stage_index === stage.order).length || 0,
      }));

      // Calculate conversion rates between stages
      const totalApps = applications?.length || 0;
      const conversionRates = Array.from({ length: stages.length - 1 }, (_, i) => {
        const currentStage = applications?.filter((a: any) => a.current_stage_index === i).length || 0;
        const nextStage = applications?.filter((a: any) => a.current_stage_index === i + 1).length || 0;
        const currentStageObj = stages[i] as any;
        const nextStageObj = stages[i + 1] as any;
        const currentStageName = currentStageObj?.name || `Stage ${i}`;
        const nextStageName = nextStageObj?.name || `Stage ${i + 1}`;
        return {
          stage: `${currentStageName} → ${nextStageName}`,
          rate: currentStage > 0 ? Math.round((nextStage / currentStage) * 100) : 0,
        };
      });

      setAnalytics({
        pipelineHealth,
        conversionRates,
        timeInStage: [],
        overview: {
          totalCandidates: totalApps,
          activeJobs: jobs?.filter((j: any) => j.status === 'published').length || 0,
          avgTimeToHire,
          offerAcceptanceRate,
        }
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-64 bg-muted rounded"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div variants={itemVariants} className="h-full">
          <SpotlightCard className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">{t('partnerAnalytics.title', 'Total Candidates')}</CardTitle>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[inset_0_0_15px_rgba(var(--primary-rgb),0.1)]">
                <Users className="h-5 w-5 text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]" />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <KineticNumber value={analytics.overview.totalCandidates} className="text-4xl font-light tracking-tight text-foreground" />
            </CardContent>
          </SpotlightCard>
        </motion.div>

        <motion.div variants={itemVariants} className="h-full">
          <SpotlightCard className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">{t('partnerAnalytics.title', 'Active Jobs')}</CardTitle>
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[inset_0_0_15px_rgba(59,130,246,0.1)]">
                <Target className="h-5 w-5 text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <KineticNumber value={analytics.overview.activeJobs} className="text-4xl font-light tracking-tight text-foreground" />
            </CardContent>
          </SpotlightCard>
        </motion.div>

        <motion.div variants={itemVariants} className="h-full">
          <SpotlightCard className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">{t('partnerAnalytics.title', 'Avg Time to Hire')}</CardTitle>
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-[inset_0_0_15px_rgba(245,158,11,0.1)]">
                <Clock className="h-5 w-5 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex items-baseline gap-2">
              <KineticNumber value={analytics.overview.avgTimeToHire} className="text-4xl font-light tracking-tight text-foreground" />
              <span className="text-sm font-medium text-muted-foreground">days</span>
            </CardContent>
          </SpotlightCard>
        </motion.div>

        <motion.div variants={itemVariants} className="h-full">
          <SpotlightCard className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">{t('partnerAnalytics.title', 'Acceptance Rate')}</CardTitle>
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[inset_0_0_15px_rgba(16,185,129,0.1)]">
                <TrendingUp className="h-5 w-5 text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex items-baseline gap-1">
              <KineticNumber value={analytics.overview.offerAcceptanceRate} className="text-4xl font-light tracking-tight text-foreground" suffix="%" />
            </CardContent>
          </SpotlightCard>
        </motion.div>
      </motion.div>

      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipeline">{t('partnerAnalytics.tab.pipelineHealth')}</TabsTrigger>
          <TabsTrigger value="conversion">{t('partnerAnalytics.tab.conversionRates')}</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <Card>
            <CardHeader>
              <CardTitle>{t('partnerAnalytics.title')}</CardTitle>
              <CardDescription>{t('partnerAnalytics.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <DynamicChart
                type="bar"
                data={analytics.pipelineHealth}
                height={300}
                config={{
                  bars: [{ dataKey: 'count', fill: 'hsl(var(--primary))' }],
                  xAxisDataKey: 'name',
                  showGrid: true,
                  showTooltip: true,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion">
          <Card>
            <CardHeader>
              <CardTitle>{t('partnerAnalytics.title')}</CardTitle>
              <CardDescription>{t('partnerAnalytics.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <DynamicChart
                type="bar"
                data={analytics.conversionRates}
                height={300}
                config={{
                  bars: [{ dataKey: 'rate', fill: 'hsl(var(--secondary))' }],
                  xAxisDataKey: 'stage',
                  showGrid: true,
                  showTooltip: true,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
