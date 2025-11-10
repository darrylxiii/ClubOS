import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Briefcase,
  Clock,
  DollarSign,
  MapPin,
  Sparkles,
  Calendar,
  Users,
  Target,
  FileText
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const { data: freelanceProfile } = useQuery({
    queryKey: ["freelance-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await (supabase as any)
        .from("freelance_profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto py-12 text-center">
        <p className="text-muted-foreground">Project not found</p>
        <Button onClick={() => navigate("/projects")} className="mt-4">
          Back to Projects
        </Button>
      </div>
    );
  }

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return "Budget not specified";
    if (!max) return `From €${min?.toLocaleString()}`;
    if (!min) return `Up to €${max?.toLocaleString()}`;
    return `€${min.toLocaleString()} - €${max.toLocaleString()}`;
  };

  const isFreelancer = !!freelanceProfile;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/projects")}
          className="gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              {project.club_ai_match_enabled && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Matched
                </Badge>
              )}
              {project.category && (
                <Badge variant="outline">{project.category}</Badge>
              )}
              <Badge
                variant={
                  project.status === "open"
                    ? "default"
                    : project.status === "active"
                    ? "secondary"
                    : "outline"
                }
              >
                {project.status}
              </Badge>
            </div>

            <h1 className="text-3xl font-bold mb-2">{project.title}</h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span>
                Posted {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {project.application_count || 0} proposals
              </span>
            </div>
          </div>

          {isFreelancer && project.status === "open" && (
            <Button
              size="lg"
              onClick={() => navigate(`/projects/${projectId}/apply`)}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Apply with Club AI
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Project Description</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {project.description}
            </p>
          </Card>

          {/* Skills Required */}
          {project.skills_required && project.skills_required.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Required Skills</h2>
              <div className="flex flex-wrap gap-2">
                {project.skills_required.map((skill: string, index: number) => (
                  <Badge key={index} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Deliverables */}
          {project.deliverables && project.deliverables.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Deliverables
              </h2>
              <ul className="space-y-2">
                {project.deliverables.map((deliverable: any, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                    <span className="text-muted-foreground">{deliverable}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Success Criteria */}
          {project.success_criteria && project.success_criteria.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Success Criteria</h2>
              <ul className="space-y-2">
                {project.success_criteria.map((criteria: any, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-2" />
                    <span className="text-muted-foreground">{criteria}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Details */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Project Details</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className="font-medium">
                    {formatBudget(project.budget_min, project.budget_max)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Timeline</p>
                  <p className="font-medium">
                    {project.timeline_weeks
                      ? `${project.timeline_weeks} weeks`
                      : "Flexible"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Engagement Type</p>
                  <p className="font-medium capitalize">
                    {project.engagement_type || "Not specified"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Work Location</p>
                  <p className="font-medium capitalize">
                    {project.remote_policy || "Remote"}
                  </p>
                </div>
              </div>

              {project.start_date_target && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-medium">
                        {new Date(project.start_date_target).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {project.estimated_hours && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Hours</p>
                      <p className="font-medium">{project.estimated_hours} hours</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Requirements */}
          {project.requires_nda && (
            <Card className="p-4 border-yellow-500/50 bg-yellow-500/5">
              <p className="text-sm font-medium">⚠️ NDA Required</p>
              <p className="text-xs text-muted-foreground mt-1">
                This project requires signing a non-disclosure agreement
              </p>
            </Card>
          )}

          {project.requires_interview && (
            <Card className="p-4 border-blue-500/50 bg-blue-500/5">
              <p className="text-sm font-medium">💬 Interview Required</p>
              <p className="text-xs text-muted-foreground mt-1">
                Shortlisted candidates will be interviewed
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
