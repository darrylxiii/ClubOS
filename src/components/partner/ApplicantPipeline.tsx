import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, MessageSquare, Eye, Settings } from "lucide-react";
import { CandidateDetailDialog } from "./CandidateDetailDialog";
import { PipelineCustomizer } from "./PipelineCustomizer";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface ApplicantPipelineProps {
  companyId: string;
}

export const ApplicantPipeline = ({ companyId }: ApplicantPipelineProps) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobsAndApplications();
  }, [companyId]);

  const fetchJobsAndApplications = async () => {
    try {
      // Fetch jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('company_id', companyId)
        .in('status', ['published', 'closed']);

      if (jobsError) throw jobsError;

      // Fetch applications for these jobs
      const jobIds = jobsData?.map(j => j.id) || [];
      
      if (jobIds.length > 0) {
        const { data: appsData, error: appsError } = await supabase
          .from('applications')
          .select(`
            *,
            profiles:user_id (full_name, email, avatar_url)
          `)
          .in('job_id', jobIds)
          .order('applied_at', { ascending: false });

        if (appsError) throw appsError;
        setApplications(appsData || []);
      }

      setJobs(jobsData || []);
      if (jobsData && jobsData.length > 0 && !selectedJob) {
        setSelectedJob(jobsData[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Failed to load applicants");
    } finally {
      setLoading(false);
    }
  };

  const selectedJobData = jobs.find(j => j.id === selectedJob);
  const jobApplications = applications.filter(a => a.job_id === selectedJob);

  const stages = selectedJobData?.pipeline_stages || [
    { name: "Applied", order: 0 },
    { name: "Screening", order: 1 },
    { name: "Interview", order: 2 },
    { name: "Offer", order: 3 },
  ];

  const getApplicationsByStage = (stageIndex: number) => {
    return jobApplications.filter(app => app.current_stage_index === stageIndex);
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-64 bg-muted rounded"></div>
    </div>;
  }

  if (jobs.length === 0) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold mb-2">No active jobs</h3>
          <p className="text-sm text-muted-foreground">
            Publish a job to start receiving applications
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black uppercase">Applicant Pipeline</h2>
        <div className="flex gap-2">
          <Dialog open={customizerOpen} onOpenChange={setCustomizerOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Customize Pipeline
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              {selectedJobData && (
                <PipelineCustomizer
                  jobId={selectedJobData.id}
                  currentStages={selectedJobData.pipeline_stages}
                  onUpdate={() => {
                    fetchJobsAndApplications();
                    setCustomizerOpen(false);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
          
          {jobs.map(job => (
            <Button
              key={job.id}
              variant={selectedJob === job.id ? "default" : "outline"}
              onClick={() => setSelectedJob(job.id)}
            >
              {job.title}
              <Badge variant="secondary" className="ml-2">
                {applications.filter(a => a.job_id === job.id).length}
              </Badge>
            </Button>
          ))}
        </div>
      </div>

      {jobApplications.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-bold mb-2">No applications yet</h3>
            <p className="text-sm text-muted-foreground">
              Applications will appear here once candidates start applying
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {stages.sort((a: any, b: any) => a.order - b.order).map((stage: any) => {
            const stageApplications = getApplicationsByStage(stage.order);
            
            return (
              <Card key={stage.order} className="border-2 border-foreground">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-black uppercase">
                      {stage.name}
                    </CardTitle>
                    <Badge variant="secondary">
                      {stageApplications.length} candidates
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {stageApplications.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No candidates in this stage
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {stageApplications.map(app => (
                        <div
                          key={app.id}
                          className="flex items-center justify-between p-4 border rounded hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold">
                              {app.profiles?.full_name?.[0] || '?'}
                            </div>
                            <div>
                              <p className="font-bold">{app.profiles?.full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                Applied {new Date(app.applied_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedCandidate(app);
                                setDetailDialogOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedCandidate && (
        <CandidateDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          application={selectedCandidate}
          stages={stages}
        />
      )}
    </div>
  );
};
