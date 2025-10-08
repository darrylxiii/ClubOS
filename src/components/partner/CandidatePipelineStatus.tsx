import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TrendingUp, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface CandidatePipelineStatusProps {
  candidateId: string;
  candidateEmail: string;
}

export const CandidatePipelineStatus = ({ candidateId, candidateEmail }: CandidatePipelineStatusProps) => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

      // Load all applications for this candidate
      const { data: appsData, error } = await supabase
        .from("applications")
        .select(`
          *,
          jobs:job_id (
            id,
            title,
            company_id,
            companies:company_id (name, logo_url)
          )
        `)
        .eq("profiles.email", candidateEmail)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(appsData || []);
    } catch (error) {
      console.error("Error loading applications:", error);
      toast.error("Failed to load pipeline status");
    } finally {
      setLoading(false);
    }
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

  const handleStageChange = async (applicationId: string, newStageIndex: number) => {
    try {
      const { error } = await supabase
        .from("applications")
        .update({ current_stage_index: newStageIndex })
        .eq("id", applicationId);

      if (error) throw error;

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
        const currentStage = app.stages?.[app.current_stage_index];
        const company = app.jobs?.companies;

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
                    Applied {new Date(app.applied_at).toLocaleDateString()}
                  </div>
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
                      onValueChange={(value) => handleStageChange(app.id, parseInt(value))}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {app.stages?.map((stage: any, index: number) => (
                          <SelectItem key={index} value={index.toString()}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>
                        {app.current_stage_index + 1} / {app.stages?.length || 0} stages
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${((app.current_stage_index + 1) / (app.stages?.length || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* All Stages Timeline */}
                  <div className="flex gap-1 mt-4">
                    {app.stages?.map((stage: any, index: number) => (
                      <div
                        key={index}
                        className={`flex-1 h-2 rounded-full transition-all ${
                          index <= app.current_stage_index
                            ? "bg-primary"
                            : "bg-muted"
                        }`}
                        title={stage.name}
                      />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
