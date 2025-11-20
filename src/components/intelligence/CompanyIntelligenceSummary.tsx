import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, TrendingUp, AlertTriangle, CheckCircle, Clock, 
  Users, MessageSquare, Target, Zap, RefreshCw
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';

interface CompanyIntelligenceSummaryProps {
  companyId: string;
}

interface PartnerMember {
  id: string;
  user_id: string;
  role: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export function CompanyIntelligenceSummary({ companyId }: CompanyIntelligenceSummaryProps) {
  const [report, setReport] = useState<any>(null);
  const [partnerMembers, setPartnerMembers] = useState<PartnerMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadReport();
    loadPartnerMembers();
  }, [companyId]);

  const loadPartnerMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('company_members')
        .select(`
          id,
          user_id,
          role,
          profiles!company_members_user_id_fkey (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true);

      if (error) throw error;
      if (data) setPartnerMembers(data as any);
    } catch (error) {
      console.error('Error loading partner members:', error);
    }
  };

  const loadReport = async () => {
    try {
      setLoading(true);
      
      // Check for cached report
      const { data: cachedReport } = await supabase
        .from('interaction_ml_features')
        .select('features, computed_at')
        .eq('entity_type', 'company')
        .eq('entity_id', companyId)
        .order('computed_at', { ascending: false })
        .limit(1)
        .single();

      if (cachedReport?.features) {
        setReport(cachedReport.features);
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      setGenerating(true);
      
      const { data, error } = await supabase.functions.invoke('generate-company-intelligence-report', {
        body: { company_id: companyId, period_days: 90 }
      });

      if (error) throw error;

      if (data?.report) {
        setReport(data.report);
        toast({
          title: 'Intelligence Report Generated',
          description: 'Latest company intelligence has been analyzed.',
        });
      }
    } catch (error: any) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate intelligence report',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            No Intelligence Data Yet
          </CardTitle>
          <CardDescription>
            Generate your first intelligence report to see insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={generateReport} disabled={generating}>
            <Zap className="h-4 w-4 mr-2" />
            {generating ? 'Generating...' : 'Generate Intelligence Report'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { interaction_summary, stakeholder_map, hiring_intelligence, insights_summary, ai_recommendations } = report;

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Company Intelligence
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Last updated: {report.generated_at ? format(new Date(report.generated_at), 'PPp') : 'N/A'}
          </p>
        </div>
        <Button onClick={generateReport} disabled={generating} size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Interactions (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{interaction_summary?.last_30_days || 0}</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className={`h-3 w-3 ${interaction_summary?.frequency_trend_percent >= 0 ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-xs ${interaction_summary?.frequency_trend_percent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {interaction_summary?.frequency_trend_percent > 0 ? '+' : ''}{interaction_summary?.frequency_trend_percent || 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Relationship Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold">{ai_recommendations?.overall_health_score || 0}</div>
              <Progress value={ai_recommendations?.overall_health_score || 0} className="h-2" />
              <Badge variant={
                ai_recommendations?.relationship_status === 'hot_lead' ? 'default' :
                ai_recommendations?.relationship_status === 'warm' ? 'secondary' :
                'outline'
              }>
                {ai_recommendations?.relationship_status?.replace('_', ' ') || 'Unknown'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hiring Urgency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {hiring_intelligence?.avg_urgency_score?.toFixed(1) || '0'}<span className="text-lg text-muted-foreground">/10</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {hiring_intelligence?.active_jobs || 0} active roles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sentiment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {interaction_summary?.avg_sentiment >= 0 ? '+' : ''}{interaction_summary?.avg_sentiment?.toFixed(2) || '0'}
            </div>
            <Badge variant={
              interaction_summary?.avg_sentiment > 0.5 ? 'default' :
              interaction_summary?.avg_sentiment < -0.2 ? 'destructive' :
              'secondary'
            }>
              {interaction_summary?.avg_sentiment > 0.5 ? 'Positive' :
               interaction_summary?.avg_sentiment < -0.2 ? 'Negative' : 'Neutral'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Key Stakeholders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Key Stakeholders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stakeholder_map?.top_stakeholders?.map((stakeholder: any) => (
              <div key={stakeholder.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{stakeholder.name}</div>
                  <div className="text-sm text-muted-foreground">{stakeholder.title}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{stakeholder.role_type?.replace('_', ' ')}</Badge>
                  <div className="text-right">
                    <div className="text-sm font-medium">{stakeholder.engagement_score}/100</div>
                    <div className="text-xs text-muted-foreground">Engagement</div>
                  </div>
                </div>
              </div>
            ))}
            {(!stakeholder_map?.top_stakeholders || stakeholder_map.top_stakeholders.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">No stakeholders identified yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Partner Team Members */}
      {partnerMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Partner Team
            </CardTitle>
            <CardDescription>
              Team members managing this company relationship
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {partnerMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {member.profiles?.avatar_url ? (
                        <img src={member.profiles.avatar_url} alt={member.profiles.full_name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <span className="text-sm font-medium">{member.profiles?.full_name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">{member.profiles?.full_name || 'Unknown'}</div>
                      <div className="text-sm text-muted-foreground">{member.profiles?.email}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">{member.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      {ai_recommendations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Opportunities */}
            {ai_recommendations.opportunities?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Opportunities
                </h4>
                <ul className="space-y-1">
                  {ai_recommendations.opportunities.map((opp: string, idx: number) => (
                    <li key={idx} className="text-sm text-muted-foreground pl-6">• {opp}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Concerns */}
            {ai_recommendations.primary_concerns?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Primary Concerns
                </h4>
                <ul className="space-y-1">
                  {ai_recommendations.primary_concerns.map((concern: string, idx: number) => (
                    <li key={idx} className="text-sm text-muted-foreground pl-6">• {concern}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Actions */}
            {ai_recommendations.recommended_actions?.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Recommended Actions
                </h4>
                <div className="space-y-2">
                  {ai_recommendations.recommended_actions.map((action: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Badge variant={
                        action.priority === 'high' ? 'destructive' :
                        action.priority === 'medium' ? 'default' :
                        'secondary'
                      }>
                        {action.priority}
                      </Badge>
                      <div className="flex-1">
                        <div className="font-medium">{action.action}</div>
                        <div className="text-sm text-muted-foreground mt-1">{action.rationale}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Best Contact & Timing */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Best Contact</div>
                <div className="font-medium mt-1">{ai_recommendations.best_contact || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Optimal Timing</div>
                <div className="font-medium mt-1 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {ai_recommendations.optimal_timing || 'N/A'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights Summary */}
      {insights_summary && (
        <div className="grid grid-cols-2 gap-4">
          {insights_summary.positive_signals?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Positive Signals ({insights_summary.positive_signals.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {insights_summary.positive_signals.slice(0, 5).map((signal: string, idx: number) => (
                    <li key={idx} className="text-sm text-muted-foreground">• {signal}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {insights_summary.red_flags?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Red Flags ({insights_summary.red_flags.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {insights_summary.red_flags.slice(0, 5).map((flag: string, idx: number) => (
                    <li key={idx} className="text-sm text-muted-foreground">• {flag}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
