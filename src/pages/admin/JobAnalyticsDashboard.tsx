import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionLoader } from "@/components/ui/unified-loader";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { ArrowLeft, DollarSign, Activity } from "lucide-react";

interface Metrics {
  sourced: number;
  normalized: number;
  analyzed: number;
  shortlisted: number;
  hired: number;
  total_spend_tokens: number;
  avg_score: number;
}

const JobAnalyticsDashboard = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics>({
    sourced: 0, normalized: 0, analyzed: 0, shortlisted: 0, hired: 0, total_spend_tokens: 0, avg_score: 0
  });
  const [sourcePerformance, setSourcePerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState("");

  useEffect(() => {
    if (jobId) fetchAnalytics();
  }, [jobId]);

  const fetchAnalytics = async () => {
    // 1. Get Job Info
    const { data: job } = await supabase.from('jobs').select('title').eq('id', jobId).single();
    if (job) setJobTitle(job.title);

    // 2. Get Configs for this job
    const { data: configs } = await supabase.from('recruitment_project_configs').select('id').eq('job_id', jobId);
    const configIds = configs?.map(c => c.id) || [];

    if (configIds.length === 0) {
      setLoading(false);
      return;
    }

    // 3. Get Search Queue Stats (Sourced)
    const { count: sourcedCount } = await supabase
      .from('recruitment_search_queue')
      .select('id', { count: 'exact', head: true })
      .in('project_config_id', configIds);

    // 4. Get Scores Stats (Analyzed, Shortlisted, Hired)
    const { data: scores } = await supabase
      .from('recruitment_candidate_scores')
      .select('total_score, tier_1_verdict, human_feedback')
      .in('project_config_id', configIds);

    const analyzed = scores?.length || 0;
    const passedT1 = scores?.filter(s => s.tier_1_verdict === 'pass').length || 0;
    const shortlisted = scores?.filter(s => s.human_feedback === 'approve').length || 0;
    const hired = scores?.filter(s => s.human_feedback === 'hired').length || 0;

    // 5. Get Strategy Performance (real data from search queue)
    const { data: strategies } = await supabase
      .from('recruitment_search_queue')
      .select('strategy_name, result_count, status')
      .in('project_config_id', configIds);

    const strategyColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#7cc6fe'];
    const strategyMap = new Map<string, number>();

    (strategies || []).forEach(s => {
      const name = s.strategy_name || 'Unknown';
      strategyMap.set(name, (strategyMap.get(name) || 0) + (s.result_count || 0));
    });

    const realSourcePerf = Array.from(strategyMap.entries()).map(([name, value], idx) => ({
      name,
      value,
      color: strategyColors[idx % strategyColors.length]
    }));

    // Cost Calc (Estimated)
    // Sourcing: $0.10 per profile (Mock API cost)
    // Analysis: $0.05 per profile (GPT-4o-mini + GPT-4o mix)
    const cost = (analyzed * 0.15);

    setMetrics({
      sourced: sourcedCount || 0,
      normalized: analyzed,
      analyzed: analyzed,
      shortlisted,
      hired,
      total_spend_tokens: cost,
      avg_score: scores?.reduce((acc, curr) => acc + (curr.total_score || 0), 0) / (analyzed || 1)
    });

    setSourcePerformance(realSourcePerf.length > 0 ? realSourcePerf : [
      { name: 'No Data', value: 1, color: '#e0e7ff' }
    ]);
    setLoading(false);
  };

  if (loading) return <SectionLoader text="Calculating funnel..." />;

  const funnelData = [
    { name: 'Sourced', value: metrics.sourced },
    { name: 'Analyzed', value: metrics.analyzed },
    { name: 'Shortlisted', value: metrics.shortlisted },
    { name: 'Hired', value: metrics.hired },
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => navigate('/admin/job-analytics')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-indigo-600" />
            Source Efficiency: {jobTitle}
          </h1>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sourced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.sourced}</div>
            <p className="text-xs text-muted-foreground">Candidates processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(metrics.avg_score)}%</div>
            <p className="text-xs text-muted-foreground">Quality Baseline</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.sourced > 0 ? ((metrics.shortlisted / metrics.sourced) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Source to Shortlist</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Est. Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <DollarSign className="h-4 w-4" />
              {metrics.total_spend_tokens.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Compute & Tokens</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Funnel Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Recruitment Funnel</CardTitle>
            <CardDescription>Conversion through the pipeline</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip cursor={{ fill: 'transparent' }} />
                <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={32}>
                  {funnelData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#e0e7ff', '#818cf8', '#4f46e5', '#312e81'][index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source Quality */}
        <Card>
          <CardHeader>
            <CardTitle>Strategy ROI</CardTitle>
            <CardDescription>Which strategies yield the best candidates?</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourcePerformance}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sourcePerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JobAnalyticsDashboard;
