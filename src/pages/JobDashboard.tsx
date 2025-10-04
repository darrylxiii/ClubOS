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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/partner-dashboard')}
              className="mb-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-3">
              {job.companies?.logo_url && (
                <img
                  src={job.companies.logo_url}
                  alt={job.companies.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div>
                <h1 className="text-3xl font-black uppercase">{job.title}</h1>
                <p className="text-muted-foreground">{job.companies?.name}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant={job.status === 'published' ? 'default' : 'secondary'}>
              {job.status}
            </Badge>
            <Dialog open={customizerOpen} onOpenChange={setCustomizerOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Customize Pipeline
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <PipelineCustomizer
                  jobId={job.id}
                  currentStages={stages}
                  onUpdate={() => {
                    fetchJobDetails();
                    setCustomizerOpen(false);
                    toast.success("Pipeline updated successfully");
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Job Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Applicants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black">
                <Users className="w-5 h-5 inline mr-2" />
                <span id="total-applicants">0</span>
              </div>
            </CardContent>
          </Card>
          {stages.slice(0, 3).map((stage: any) => (
            <Card key={stage.order}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stage.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black" id={`stage-${stage.order}-count`}>
                  0
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="candidates" className="w-full">
          <TabsList>
            <TabsTrigger value="candidates">Candidates</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="candidates" className="space-y-4">
            <JobDashboardCandidates
              jobId={job.id}
              stages={stages}
              onUpdate={fetchJobDetails}
            />
          </TabsContent>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-bold mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground">
                    {job.description || "No description provided"}
                  </p>
                </div>
                {job.requirements && job.requirements.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-2">Requirements</h3>
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
            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Analytics coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
