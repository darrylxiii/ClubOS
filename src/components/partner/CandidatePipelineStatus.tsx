import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TrendingUp, Clock, CheckCircle2, XCircle, AlertCircle, User, ArrowRight } from "lucide-react";
import { EnhancedCandidateActionDialog } from "./EnhancedCandidateActionDialog";

interface CandidatePipelineStatusProps {
  candidateId: string;
  candidateEmail: string;
}

export const CandidatePipelineStatus = ({ candidateId, candidateEmail }: CandidatePipelineStatusProps) => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [actionType, setActionType] = useState<'advance' | 'decline'>('advance');

  useEffect(() => {
    loadApplications();
  }, [candidateId, candidateEmail]);

  const loadApplications = async () => {
    try {
      // Find candidate profile
      const { data: candidate } = await supabase
        .from("candidate_profiles")
        .select("id")
        .eq("email", candidateEmail)
        .maybeSingle();

      if (!candidate) {
        setLoading(false);
        return;
      }

      // Load all applications for this candidate with sourcer info
      const { data: appsData, error } = await supabase
        .from("applications")
        .select(`
          *,
          sourced_by,
          jobs:job_id (
            id,
            title,
            company_id,
            pipeline_stages,
            companies:company_id (name, logo_url)
          )
        `)
        .or(`user_id.eq.${candidateId},candidate_id.eq.${candidate.id}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch sourcer profiles for all applications
      const sourcerIds = appsData?.filter(app => app.sourced_by).map(app => app.sourced_by) || [];
      let sourcerProfiles: any = {};
      
      if (sourcerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', sourcerIds);
        
        sourcerProfiles = profiles?.reduce((acc: any, profile: any) => {
          acc[profile.id] = profile;
          return acc;
        }, {}) || {};
      }

      // Attach sourcer info to applications
      const enrichedApps = appsData?.map(app => ({
        ...app,
        sourcerProfile: app.sourced_by ? sourcerProfiles[app.sourced_by] : null
      }));

      setApplications(enrichedApps || []);
    } catch (error) {
      console.error("Error loading applications:", error);
      toast.error("Failed to load pipeline status");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (app: any, type: 'advance' | 'decline') => {
    setSelectedApplication(app);
    setActionType(type);
    setActionDialogOpen(true);
  };

  const handleActionComplete = () => {
    setActionDialogOpen(false);
    setSelectedApplication(null);
    loadApplications();
  };

  const getStatusBadge = (status: string, currentStage: any) => {
    const statusConfig: Record<string, { icon: any; variant: any; label: string }> = {
      active: { icon: Clock, variant: "default", label: "Active" },
      hired: { icon: CheckCircle2, variant: "success", label: "Hired" },
      rejected: { icon: XCircle, variant: "destructive", label: "Rejected" },
      withdrawn: { icon: AlertCircle, variant: "secondary", label: "Withdrawn" },
    };

    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const handleStageChange = async (applicationId: string, newStageIndex: number, app: any) => {
    try {
      const currentStageIndex = app.current_stage_index;
      const stages = app.jobs?.pipeline_stages || app.stages || [];
      
      const { error } = await supabase
        .from("applications")
        .update({ current_stage_index: newStageIndex })
        .eq("id", applicationId);

      if (error) throw error;

      // Log to pipeline audit log
      const { data: { user } } = await supabase.auth.getUser();
      const { data: candidateProfile } = await supabase
        .from('candidate_profiles')
        .select('full_name')
        .eq('email', candidateEmail)
        .maybeSingle();

      if (user) {
        await supabase.from('pipeline_audit_logs').insert({
          job_id: app.job_id,
          user_id: user.id,
          action: 'stage_changed_manual',
          stage_data: {
            candidate_name: candidateProfile?.full_name || candidateEmail,
            from_stage_index: currentStageIndex,
            to_stage_index: newStageIndex,
            from_stage_name: stages[currentStageIndex]?.name,
            to_stage_name: stages[newStageIndex]?.name
          },
          metadata: {
            application_id: applicationId,
            method: 'dropdown_select'
          }
        });
      }

      toast.success("Pipeline stage updated");
      loadApplications();
    } catch (error) {
      console.error("Error updating stage:", error);
      toast.error("Failed to update stage");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Pipeline Status
          </CardTitle>
          <CardDescription>No active applications found</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Pipeline Status
          </CardTitle>
          <CardDescription>Track candidate progress across all job applications</CardDescription>
        </CardHeader>
      </Card>

      {applications.map((app) => {
        const stages = (app.jobs?.pipeline_stages || app.stages || []) as any[];
        const currentStage = stages[app.current_stage_index];
        const company = app.jobs?.companies;
        const nextStage = stages[app.current_stage_index + 1];
        const daysInStage = Math.floor((new Date().getTime() - new Date(app.updated_at).getTime()) / (1000 * 60 * 60 * 24));

        return (
          <Card key={app.id}>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {company?.logo_url && (
                      <img src={company.logo_url} alt={company.name} className="w-10 h-10 rounded" />
                    )}
                    <div>
                      <h3 className="font-semibold">{app.position}</h3>
                      <p className="text-sm text-muted-foreground">{company?.name || app.company_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Applied {new Date(app.applied_at).toLocaleDateString()} • {daysInStage} days in stage
                  </div>
                  
                  {/* Sourcer Info */}
                  {app.sourcerProfile && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Sourced by:</span>
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={app.sourcerProfile.avatar_url} />
                        <AvatarFallback>{app.sourcerProfile.full_name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{app.sourcerProfile.full_name || 'Unknown'}</span>
                    </div>
                  )}
                </div>
                {getStatusBadge(app.status, currentStage)}
              </div>

              {/* Current Stage */}
              {currentStage && app.status === 'active' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Current Stage</p>
                      <p className="text-lg font-semibold">{currentStage.name}</p>
                    </div>
                    <Select
                      value={app.current_stage_index.toString()}
                      onValueChange={(value) => handleStageChange(app.id, parseInt(value), app)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage: any, index: number) => (
                          <SelectItem key={index} value={index.toString()}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{app.current_stage_index + 1} / {stages.length} stages</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${((app.current_stage_index + 1) / stages.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-1 mt-4">
                    {stages.map((stage: any, index: number) => (
                      <div
                        key={index}
                        className={`flex-1 h-2 rounded-full transition-all ${
                          index <= app.current_stage_index ? "bg-primary" : "bg-muted"
                        }`}
                        title={stage.name}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2 pt-3 border-t">
                    {nextStage && (
                      <Button size="sm" onClick={() => handleAction(app, 'advance')} className="gap-2">
                        Advance to {nextStage.name}
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                    <Button 
                      size="sm" variant="outline"
                      onClick={() => handleAction(app, 'decline')}
                      className="gap-2 border-destructive text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="h-3 w-3" />
                      Decline
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Enhanced Action Dialog */}
      {selectedApplication && (
        <EnhancedCandidateActionDialog
          open={actionDialogOpen}
          onOpenChange={setActionDialogOpen}
          candidateId={candidateId}
          candidateName={candidateEmail}
          applicationId={selectedApplication.id}
          jobId={selectedApplication.job_id}
          jobTitle={selectedApplication.jobs?.title || selectedApplication.position}
          companyName={selectedApplication.jobs?.companies?.name || selectedApplication.company_name}
          currentStage={selectedApplication.stages?.[selectedApplication.current_stage_index]?.name || 'Applied'}
          currentStageIndex={selectedApplication.current_stage_index}
          stages={selectedApplication.stages || []}
          nextStage={selectedApplication.stages?.[selectedApplication.current_stage_index + 1]?.name}
          actionType={actionType}
          onComplete={handleActionComplete}
        />
      )}
    </div>
  );
};
