import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Users, Settings } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { JobDashboardCandidates } from "@/components/partner/JobDashboardCandidates";
import { PipelineCustomizer } from "@/components/partner/PipelineCustomizer";
import { PipelineAuditLog } from "@/components/partner/PipelineAuditLog";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export default function JobDashboard() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [customizerOpen, setCustomizerOpen] = useState(false);

  const isAuthorized = role === 'admin' || role === 'partner';

  useEffect(() => {
    if (!roleLoading && !isAuthorized) {
      toast.error("You don't have permission to access this page");
      navigate('/dashboard');
      return;
    }

    if (jobId && isAuthorized) {
      fetchJobDetails();
    }
  }, [jobId, roleLoading, isAuthorized]);

  const fetchJobDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          companies (
            name,
            logo_url
          )
        `)
        .eq('id', jobId)
        .single();

      if (error) throw error;
      setJob(data);
    } catch (error) {
      console.error('Error fetching job:', error);
      toast.error("Failed to load job details");
      navigate('/partner-dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (roleLoading || loading) {
    return (
      <AppLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </AppLayout>
    );
  }

  if (!job) {
    return (
      <AppLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Job not found</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const stages = job.pipeline_stages || [
    { name: "Applied", order: 0 },
    { name: "Screening", order: 1 },
    { name: "Interview", order: 2 },
    { name: "Offer", order: 3 },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Premium Header with Glass Morphism */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-accent/20 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl p-8 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/10 via-transparent to-primary/10" />
          
          <div className="relative flex items-start justify-between">
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/partner-dashboard')}
                className="mb-2 hover:bg-accent/20 transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="flex items-center gap-4">
                {job.companies?.logo_url && (
                  <div className="relative group">
                    <div className="absolute inset-0 bg-accent/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300" />
                    <img
                      src={job.companies.logo_url}
                      alt={job.companies.name}
                      className="relative w-16 h-16 rounded-xl object-cover border-2 border-accent/30 shadow-lg"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <h1 className="text-4xl font-black uppercase bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text">
                    {job.title}
                  </h1>
                  <p className="text-muted-foreground font-medium">{job.companies?.name}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Badge 
                variant={job.status === 'published' ? 'default' : 'secondary'}
                className="h-8 px-4 text-sm font-bold animate-pulse"
              >
                {job.status}
              </Badge>
              <Dialog open={customizerOpen} onOpenChange={setCustomizerOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline"
                    className="bg-gradient-to-r from-accent/10 to-primary/10 border-accent/30 hover:border-accent hover:shadow-lg hover:shadow-accent/20 transition-all duration-300"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Customize Pipeline
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <PipelineCustomizer
                    jobId={job.id}
                    currentStages={stages}
                    onUpdate={() => {
                      fetchJobDetails();
                      setCustomizerOpen(false);
                      toast.success("Pipeline updated successfully", {
                        description: "Your exclusive hiring flow is now live",
                        duration: 4000
                      });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Premium Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-2 border-accent/20 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm hover:border-accent/40 transition-all duration-300 group">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-accent/20 group-hover:bg-accent/30 transition-colors">
                  <Users className="w-4 h-4 text-accent" />
                </div>
                Total Applicants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black" id="total-applicants">0</div>
            </CardContent>
          </Card>
          {stages.slice(0, 3).map((stage: any) => (
            <Card 
              key={stage.order}
              className="border-2 border-primary/20 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm hover:border-primary/40 transition-all duration-300 group"
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase text-muted-foreground">
                  {stage.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-black group-hover:text-primary transition-colors" id={`stage-${stage.order}-count`}>
                  0
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="candidates" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-card/50 to-card/30 backdrop-blur-sm border border-accent/20">
            <TabsTrigger value="candidates" className="data-[state=active]:bg-accent/20">
              Candidates
            </TabsTrigger>
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20">
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-secondary/20">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-accent/20">
              Audit Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="candidates" className="space-y-4">
            <JobDashboardCandidates
              jobId={job.id}
              stages={stages}
              onUpdate={fetchJobDetails}
            />
          </TabsContent>

          <TabsContent value="overview">
            <Card className="border-2 border-primary/20 backdrop-blur-xl bg-background/90">
              <CardHeader>
                <CardTitle className="font-black uppercase">Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-bold mb-2 text-lg">Description</h3>
                  <p className="text-sm text-muted-foreground">
                    {job.description || "No description provided"}
                  </p>
                </div>
                {job.requirements && job.requirements.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-2 text-lg">Requirements</h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {job.requirements.map((req: string, idx: number) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card className="border-2 border-secondary/20 backdrop-blur-xl bg-background/90">
              <CardHeader>
                <CardTitle className="font-black uppercase">Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Advanced analytics coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <PipelineAuditLog jobId={job.id} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
