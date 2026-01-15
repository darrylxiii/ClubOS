import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ContactWithScore, CRMDeal } from "@/types/crm";
import { useCRMLeadScoring } from "@/hooks/useCRMLeadScoring";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ActivityTimeline } from "./ActivityTimeline";
import { 
  ArrowLeft, Building2, Tag, 
  Target, Sparkles, Briefcase, User
} from "lucide-react";
import { toast } from "sonner";

export default function ContactProfileView() {
  const { contactId } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState<ContactWithScore | null>(null);
  const [deals, setDeals] = useState<CRMDeal[]>([]);
  const [loading, setLoading] = useState(true);

  const { scoreBreakdown, loading: scoringLoading, recalculateScore } = useCRMLeadScoring(contactId || '');

  useEffect(() => {
    if (contactId) {
      loadContact();
      loadDeals();
    }
  }, [contactId]);

  const loadContact = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_contacts' as any)
        .select('*')
        .eq('id', contactId)
        .single();

      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url, location')
        .eq('id', (data as any).profile_id)
        .single();

      const contactData: any = data;
      
      setContact({
        ...contactData,
        full_name: profile?.full_name,
        email: profile?.email,
        avatar_url: profile?.avatar_url
      } as ContactWithScore);
    } catch (error) {
      console.error('Error loading contact:', error);
      toast.error('Failed to load contact');
    } finally {
      setLoading(false);
    }
  };

  const loadDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_deals' as any)
        .select(`
          *,
          company:companies(name),
          owner:owner_id(full_name)
        `)
        .or(`job_id.in.(select job_id from applications where user_id=(select profile_id from crm_contacts where id=${contactId}))`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDeals(data.map((d: any) => ({
        ...d,
        company_name: d.company?.name,
        owner_name: d.owner?.full_name
      })) as CRMDeal[]);
    } catch (error) {
      console.error('Error loading deals:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getLifecycleColor = (stage: string | null) => {
    const colors: Record<string, string> = {
      lead: "bg-gray-500",
      qualified: "bg-blue-500",
      active: "bg-green-500",
      inactive: "bg-yellow-500",
      churned: "bg-red-500"
    };
    return colors[stage || 'lead'] || "bg-gray-500";
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[100dvh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!contact) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Contact Not Found</h2>
              <Button onClick={() => navigate('/crm/contacts')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Contacts
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6 max-w-7xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/crm/contacts')}
          className="group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Contacts
        </Button>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Contact Info */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={contact.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">
                      {contact.full_name?.substring(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <h2 className="text-xl font-bold">{contact.full_name || 'Unknown'}</h2>
                    <p className="text-sm text-muted-foreground">{contact.email}</p>
                  </div>

                  <Badge className={getLifecycleColor(contact.lifecycle_stage)}>
                    {contact.lifecycle_stage || 'lead'}
                  </Badge>

                  {contact.company_name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="w-4 h-4" />
                      {contact.company_name}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Lead Score Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Lead Score
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getScoreColor(contact.lead_score)}`}>
                    {contact.lead_score}
                  </div>
                  <p className="text-xs text-muted-foreground">out of 100</p>
                </div>

                {scoreBreakdown && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Assessments</span>
                        <span className="font-medium">{Math.round(scoreBreakdown.assessment)}/40</span>
                      </div>
                      <Progress value={(scoreBreakdown.assessment / 40) * 100} />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Engagement</span>
                        <span className="font-medium">{Math.round(scoreBreakdown.engagement)}/30</span>
                      </div>
                      <Progress value={(scoreBreakdown.engagement / 30) * 100} />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Profile</span>
                        <span className="font-medium">{Math.round(scoreBreakdown.profile)}/15</span>
                      </div>
                      <Progress value={(scoreBreakdown.profile / 15) * 100} />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Referrals</span>
                        <span className="font-medium">{Math.round(scoreBreakdown.referrals)}/10</span>
                      </div>
                      <Progress value={(scoreBreakdown.referrals / 10) * 100} />
                    </div>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={recalculateScore}
                  disabled={scoringLoading}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Recalculate
                </Button>
              </CardContent>
            </Card>

            {/* Tags */}
            {contact.tags && contact.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {contact.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="col-span-12 lg:col-span-9">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
                <TabsTrigger value="assessments">Assessments</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{contact.engagement_score}</div>
                        <p className="text-xs text-muted-foreground">Engagement</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">{deals.length}</div>
                        <p className="text-xs text-muted-foreground">Active Deals</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold capitalize">{contact.contact_type}</div>
                        <p className="text-xs text-muted-foreground">Type</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ActivityTimeline contactId={contactId} limit={5} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity">
                <ActivityTimeline contactId={contactId} limit={50} />
              </TabsContent>

              <TabsContent value="deals" className="space-y-4">
                {deals.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Briefcase className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">No deals yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  deals.map(deal => (
                    <Card key={deal.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{deal.title}</CardTitle>
                            <p className="text-sm text-muted-foreground">{deal.company_name}</p>
                          </div>
                          <Badge>{deal.stage}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {deal.deal_type.replace('_', ' ')}
                          </span>
                          {deal.value && (
                            <span className="font-medium">
                              {deal.currency} {deal.value.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="assessments">
                <Card>
                  <CardContent className="py-12 text-center">
                    <Target className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">Assessment results integration coming soon</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
