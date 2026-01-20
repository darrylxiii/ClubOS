import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, UserCheck, UserX, MessageSquare, AlertCircle } from "lucide-react";
import { CandidateDetailDialog } from "./CandidateDetailDialog";
import { EnhancedCandidateActionDialog } from "./EnhancedCandidateActionDialog";

interface JobDashboardCandidatesProps {
  jobId: string;
  stages: any[];
  onUpdate: () => void;
  needsClubCheck: number;
}

export const JobDashboardCandidates = ({ jobId, stages, onUpdate, needsClubCheck }: JobDashboardCandidatesProps) => {
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    application: any;
    action: 'advance' | 'decline' | null;
  }>({
    open: false,
    application: null,
    action: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();

    // Subscribe to real-time updates with detailed logging
    const channel = supabase
      .channel('applications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          console.log('[JobDashboard] Real-time update received:', payload);
          fetchApplications();
        }
      )
      .subscribe((status) => {
        console.log('[JobDashboard] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          candidate_profiles!applications_candidate_id_fkey (
            id,
            user_id,
            full_name,
            email,
            phone,
            avatar_url,
            current_title,
            current_company
          ),
          jobs!applications_job_id_fkey (
            id,
            title,
            company_id,
            companies!jobs_company_id_fkey (
              id,
              name,
              logo_url
            )
          )
        `)
        .eq('job_id', jobId)
        .neq('status', 'rejected')
        .order('applied_at', { ascending: false });

      if (error) throw error;

      // Map candidate_profiles to profiles for backward compatibility
      const enrichedData = (data || []).map(app => ({
        ...app,
        profiles: app.candidate_profiles || (app.user_id ? null : null)
      }));

      setApplications(enrichedData || []);
      
      // Update stats
      updateStats(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error("Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (apps: any[]) => {
    const totalElement = document.getElementById('total-applicants');
    if (totalElement) totalElement.textContent = apps.length.toString();

    stages.forEach((stage) => {
      const count = apps.filter(app => app.current_stage_index === stage.order).length;
      const element = document.getElementById(`stage-${stage.order}-count`);
      if (element) element.textContent = count.toString();
    });
  };

  const getApplicationsByStage = (stageIndex: number) => {
    return applications.filter(app => app.current_stage_index === stageIndex);
  };

  const handleOpenActionDialog = (application: any, action: 'advance' | 'decline') => {
    setActionDialog({
      open: true,
      application,
      action,
    });
  };

  const handleCloseActionDialog = () => {
    setActionDialog({
      open: false,
      application: null,
      action: null,
    });
  };

  const handleActionComplete = async () => {
    console.log('[JobDashboard] Action completed, refreshing data...');
    await fetchApplications();
    onUpdate();
    handleCloseActionDialog();
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-64 bg-muted rounded"></div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <UserCheck className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold mb-2">No applications yet</h3>
          <p className="text-sm text-muted-foreground">
            Applications will appear here once candidates start applying
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {needsClubCheck > 0 && (
        <Card className="border border-border/50 bg-gradient-to-br from-amber-500/5 to-accent/5 backdrop-blur-xl hover:border-accent/40 transition-all duration-300 animate-fade-in">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/10 animate-pulse">
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">
                    {needsClubCheck} Candidate{needsClubCheck !== 1 ? 's' : ''} Need Club Check
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Review and advance premium candidates faster with our exclusive vetting
                  </p>
                </div>
              </div>
              <Button 
                size="lg"
                className="bg-gradient-to-r from-accent via-accent/95 to-accent/90 hover:from-accent/95 hover:via-accent hover:to-accent text-accent-foreground font-semibold shadow-glass-lg hover:shadow-glass-xl transition-all duration-300 hover:-translate-y-0.5 whitespace-nowrap"
              >
                Club Check Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {stages.sort((a, b) => a.order - b.order).map((stage) => {
          const stageApplications = getApplicationsByStage(stage.order);
          const isLastStage = stage.order === stages.length - 1;

          return (
            <Card key={stage.order} className="border-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-black uppercase">
                    {stage.name}
                  </CardTitle>
                  <Badge variant="secondary">
                    {stageApplications.length} candidate{stageApplications.length !== 1 ? 's' : ''}
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
                    {stageApplications.map((app) => (
                      <div
                        key={app.id}
                        className="flex items-center justify-between p-4 border rounded hover:bg-muted/50 transition-colors"
                      >
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold">
                             {app.candidate_profiles?.full_name?.[0]?.toUpperCase() || 
                              app.profiles?.full_name?.[0]?.toUpperCase() || 
                              app.candidate_full_name?.[0]?.toUpperCase() || '?'}
                           </div>
                           <div>
                             <p className="font-bold">
                               {app.candidate_profiles?.full_name || 
                                app.profiles?.full_name || 
                                app.candidate_full_name || 
                                'Unknown Candidate'}
                             </p>
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
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleOpenActionDialog(app, 'advance')}
                            disabled={isLastStage && stages.length === (app.current_stage_index + 1)}
                          >
                            <UserCheck className="w-4 h-4 mr-2" />
                            Advance
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenActionDialog(app, 'decline')}
                          >
                            <UserX className="w-4 h-4 mr-2" />
                            Reject
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

      {selectedCandidate && (
        <CandidateDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          application={selectedCandidate}
          stages={stages}
        />
      )}

      {actionDialog.application && actionDialog.action && (
        <EnhancedCandidateActionDialog
          open={actionDialog.open}
          onOpenChange={handleCloseActionDialog}
          candidateId={actionDialog.application.candidate_id || actionDialog.application.user_id}
          candidateName={
            actionDialog.application.candidate_profiles?.full_name || 
            actionDialog.application.profiles?.full_name || 
            actionDialog.application.candidate_full_name || 
            'Candidate'
          }
          applicationId={actionDialog.application.id}
          jobId={actionDialog.application.jobs?.id || jobId}
          jobTitle={actionDialog.application.jobs?.title || ''}
          companyName={actionDialog.application.jobs?.companies?.name || ''}
          currentStage={stages[actionDialog.application.current_stage_index]?.name || ''}
          currentStageIndex={actionDialog.application.current_stage_index}
          stages={stages}
          nextStage={stages[actionDialog.application.current_stage_index + 1]?.name}
          actionType={actionDialog.action}
          onComplete={handleActionComplete}
        />
      )}
    </>
  );
};
