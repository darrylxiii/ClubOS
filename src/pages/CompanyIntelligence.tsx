import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingUp, TrendingDown, Phone, Mail, MessageSquare, Video, User, Calendar, Settings, AlertTriangle, Lightbulb, Target, Sparkles } from 'lucide-react';
import type { CompanyInteraction, CompanyStakeholder } from '@/types/interaction';
import { AppLayout } from '@/components/AppLayout';
import { toast } from 'sonner';

export default function CompanyIntelligence() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [interactions, setInteractions] = useState<CompanyInteraction[]>([]);
  const [stakeholders, setStakeholders] = useState<CompanyStakeholder[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load company
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();
      setCompany(companyData);

      // Load interactions
      const { data: interactionsData } = await (supabase as any)
        .from('company_interactions')
        .select('*')
        .eq('company_id', id)
        .order('interaction_date', { ascending: false })
        .limit(50);
      setInteractions(interactionsData || []);

      // Load stakeholders
      const { data: stakeholdersData } = await (supabase as any)
        .from('company_stakeholders')
        .select('*')
        .eq('company_id', id)
        .order('engagement_score', { ascending: false });
      setStakeholders(stakeholdersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    if (!id) return;
    setLoadingInsights(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-company-insights', {
        body: { companyId: id }
      });
      
      if (error) throw error;
      
      if (data?.insights) {
        setInsights(data.insights);
        toast.success("Insights generated successfully");
      }
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error("Failed to generate insights");
    } finally {
      setLoadingInsights(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!company) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8">
          <p className="text-muted-foreground">Company not found</p>
        </div>
      </AppLayout>
    );
  }

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'phone_call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
      case 'zoom_meeting': return <Video className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'decision_maker': return 'bg-primary text-primary-foreground';
      case 'influencer': return 'bg-blue-500 text-white';
      case 'champion': return 'bg-green-500 text-white';
      case 'gatekeeper': return 'bg-yellow-500 text-white';
      case 'blocker': return 'bg-red-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const totalInteractions = interactions.length;
  const avgSentiment = interactions.reduce((sum, i) => sum + (i.sentiment_score || 0), 0) / (totalInteractions || 1);
  const avgUrgency = interactions.reduce((sum, i) => sum + (i.urgency_score || 0), 0) / (totalInteractions || 1);
  const interactionsByType = interactions.reduce((acc, i) => {
    acc[i.interaction_type] = (acc[i.interaction_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppLayout>
      <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{company.name}</h1>
          <p className="text-muted-foreground">Company Intelligence Dashboard</p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`/companies/${id}/domains`)}
        >
          <Settings className="h-4 w-4 mr-2" />
          Email Domains
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalInteractions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Sentiment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold">{(avgSentiment * 100).toFixed(0)}%</div>
              {avgSentiment > 0 ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Urgency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgUrgency.toFixed(1)}/10</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stakeholders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stakeholders.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="timeline" className="space-y-6">
        <TabsList>
          <TabsTrigger value="timeline">Interaction Timeline</TabsTrigger>
          <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Interactions</CardTitle>
              <CardDescription>Latest communication with this company</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {interactions.map((interaction) => (
                  <div key={interaction.id} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="mt-1">{getInteractionIcon(interaction.interaction_type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{interaction.subject || 'No subject'}</span>
                        <Badge variant="outline" className="text-xs">
                          {interaction.interaction_type.replace('_', ' ')}
                        </Badge>
                        {interaction.urgency_score && interaction.urgency_score > 7 && (
                          <Badge variant="destructive" className="text-xs">High Urgency</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {interaction.summary || 'No summary available'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(interaction.interaction_date).toLocaleDateString()}
                        </span>
                        {interaction.duration_minutes && (
                          <span>{interaction.duration_minutes} minutes</span>
                        )}
                        {interaction.direction && (
                          <Badge variant="outline" className="text-xs">{interaction.direction}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {interactions.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No interactions recorded yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Interaction Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Interaction Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(interactionsByType).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3 p-3 border rounded-lg">
                    {getInteractionIcon(type)}
                    <div>
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-xs text-muted-foreground">{type.replace('_', ' ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stakeholders Tab */}
        <TabsContent value="stakeholders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Stakeholders</CardTitle>
              <CardDescription>Key people at this company</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stakeholders.map((stakeholder) => (
                  <div key={stakeholder.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{stakeholder.full_name}</span>
                        <Badge className={getRoleColor(stakeholder.role_type)}>
                          {stakeholder.role_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      {stakeholder.job_title && (
                        <p className="text-sm text-muted-foreground mb-2">{stakeholder.job_title}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {stakeholder.email && <span>{stakeholder.email}</span>}
                        {stakeholder.total_interactions > 0 && (
                          <span>{stakeholder.total_interactions} interactions</span>
                        )}
                        {stakeholder.engagement_score && (
                          <span>Engagement: {stakeholder.engagement_score}/100</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {stakeholders.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No stakeholders recorded yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Intelligence Insights
                  </CardTitle>
                  <CardDescription>AI-powered analysis of your company interactions</CardDescription>
                </div>
                <Button onClick={generateInsights} disabled={loadingInsights}>
                  {loadingInsights ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Generate Insights
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {insights ? (
                <div className="space-y-6">
                  {/* Engagement Score */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Engagement Score</span>
                      </div>
                      <div className="text-3xl font-bold">{insights.engagement_score}/100</div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        {insights.sentiment_trend === 'positive' ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : insights.sentiment_trend === 'negative' ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : (
                          <TrendingUp className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="text-sm font-medium">Sentiment Trend</span>
                      </div>
                      <div className="text-xl font-bold capitalize">{insights.sentiment_trend}</div>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Preferred Channel</span>
                      </div>
                      <div className="text-xl font-bold capitalize">{insights.preferred_channel?.replace('_', ' ')}</div>
                    </Card>
                  </div>

                  {/* Signals */}
                  {insights.signals?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Active Signals
                      </h4>
                      <div className="space-y-2">
                        {insights.signals.map((signal: any, idx: number) => (
                          <div key={idx} className={`p-3 rounded-lg border ${
                            signal.priority === 'high' ? 'border-red-500/50 bg-red-500/10' : 
                            signal.priority === 'medium' ? 'border-yellow-500/50 bg-yellow-500/10' : 
                            'border-border'
                          }`}>
                            <div className="flex items-center gap-2">
                              <Badge variant={signal.priority === 'high' ? 'destructive' : 'secondary'}>
                                {signal.priority}
                              </Badge>
                              <span className="text-sm">{signal.message}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {insights.recommendations?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        Recommendations
                      </h4>
                      <ul className="space-y-2">
                        {insights.recommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <span className="text-primary">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    Click "Generate Insights" to analyze company interactions
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </AppLayout>
  );
}
