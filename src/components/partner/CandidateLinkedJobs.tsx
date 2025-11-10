import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Briefcase, ExternalLink, Calendar, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CandidateLinkedJobsProps {
  candidateId: string;
  candidateEmail: string;
  activeTab?: string;
  compact?: boolean;
}

export const CandidateLinkedJobs = ({ candidateId, candidateEmail, activeTab, compact = false }: CandidateLinkedJobsProps) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Always load in compact mode, otherwise only when tab is active
    if (compact || activeTab === 'pipeline' || !activeTab) {
      loadJobs();
    }
  }, [candidateId, candidateEmail, activeTab, compact]);

  const loadJobs = async () => {
    try {
      // Query by candidate_id to support standalone candidates (without user accounts)
      const { data, error } = await supabase
        .from("applications")
        .select(`
          *,
          jobs:job_id (
            id,
            title,
            description,
            location,
            job_type,
            salary_min,
            salary_max,
            currency,
            created_at,
            company_id,
            companies:company_id (
              name,
              logo_url
            )
          )
        `)
        .eq("candidate_id", candidateId)
        .order("applied_at", { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error("Error loading jobs:", error);
      toast.error("Failed to load linked jobs");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "default",
      hired: "success",
      rejected: "destructive",
      withdrawn: "secondary",
    };
    return colors[status] || "default";
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

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Linked Jobs
          </CardTitle>
          <CardDescription>No job applications found</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Linked Jobs
          </CardTitle>
          <CardDescription>All jobs this candidate has applied to</CardDescription>
        </CardHeader>
      </Card>

      {jobs.map((application) => {
        const job = application.jobs;
        const company = job?.companies;
        const currentStage = application.stages?.[application.current_stage_index];

        return (
          <Card key={application.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-4">
                  {company?.logo_url && (
                    <img
                      src={company.logo_url}
                      alt={company.name}
                      className="w-16 h-16 rounded object-cover"
                    />
                  )}
                  <div className="space-y-2">
                    <div>
                      <h3 className="font-semibold text-lg">{job?.title || application.position}</h3>
                      <p className="text-sm text-muted-foreground">
                        {company?.name || application.company_name}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={getStatusColor(application.status) as any}>
                        {application.status}
                      </Badge>
                      {currentStage && application.status === 'active' && (
                        <Badge variant="outline">{currentStage.name}</Badge>
                      )}
                      {job?.location && (
                        <Badge variant="secondary">{job.location}</Badge>
                      )}
                      {job?.job_type && (
                        <Badge variant="secondary">{job.job_type}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/jobs/${job?.id}/dashboard`)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Job
                </Button>
              </div>

              {/* Application Timeline */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <div>
                    <p className="font-medium text-foreground">Applied</p>
                    <p>{new Date(application.applied_at).toLocaleDateString()}</p>
                  </div>
                </div>
                {application.updated_at !== application.applied_at && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <div>
                      <p className="font-medium text-foreground">Last Updated</p>
                      <p>{new Date(application.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
                {job?.salary_min && job?.salary_max && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-4 h-4" />
                    <div>
                      <p className="font-medium text-foreground">Salary Range</p>
                      <p>
                        {job.currency || 'EUR'} {job.salary_min.toLocaleString()} - {job.salary_max.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress through stages */}
              {application.status === 'active' && application.stages && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>Stage Progress</span>
                    <span>
                      {application.current_stage_index + 1} / {application.stages.length}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${((application.current_stage_index + 1) / application.stages.length) * 100}%`,
                      }}
                    />
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
