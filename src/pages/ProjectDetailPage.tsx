import { AppLayout } from "@/components/AppLayout";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  DollarSign, 
  Calendar,
  Users,
  Target,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  Building2,
  ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ProjectCard } from "@/components/projects/ProjectCard";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch user's freelance profile
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile-freelance", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("open_to_freelance_work, freelance_categories, freelance_hourly_rate_min, freelance_hourly_rate_max, freelance_availability_status")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const isFreelancer = userProfile?.open_to_freelance_work === true;

  // Fetch project details
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("projects")
        .select(`
          *,
          company:companies(id, name, logo_url, description, website, size, industry),
          posted_by:profiles!projects_posted_by_fkey(id, full_name, avatar_url, current_title)
        `)
        .eq("id", projectId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch similar projects
  const { data: similarProjects } = useQuery({
    queryKey: ["similar-projects", projectId, project?.category],
    queryFn: async () => {
      if (!project?.category) return [];
      
      const { data, error } = await (supabase as any)
        .from("projects")
        .select("*")
        .eq("status", "open")
        .eq("visibility", "public")
        .neq("id", projectId)
        .limit(3);

      if (error) throw error;
      return data || [];
    },
    enabled: !!project,
  });

  // Calculate match score
  const calculateMatchBreakdown = () => {
    if (!isFreelancer || !userProfile?.freelance_categories || !project) {
      return null;
    }

    const breakdown = {
      total: 0,
      factors: [] as { label: string; score: number; max: number; reason: string }[]
    };

    // Category match
    const categoryMatches = userProfile.freelance_categories.filter(
      (cat: string) => project.required_skills?.includes(cat)
    );
    const categoryScore = Math.min(categoryMatches.length * 10, 40);
    breakdown.factors.push({
      label: "Skills Match",
      score: categoryScore,
      max: 40,
      reason: categoryMatches.length > 0 
        ? `${categoryMatches.length} matching skills: ${categoryMatches.join(", ")}`
        : "No matching skills from your profile"
    });

    // Budget match
    const userMinRate = userProfile.freelance_hourly_rate_min || 0;
    const userMaxRate = userProfile.freelance_hourly_rate_max || 999999;
    const projectBudgetMin = project.budget_min || 0;
    const projectBudgetMax = project.budget_max || 999999;
    
    const budgetScore = (projectBudgetMax >= userMinRate && projectBudgetMin <= userMaxRate) ? 30 : 0;
    breakdown.factors.push({
      label: "Budget Compatibility",
      score: budgetScore,
      max: 30,
      reason: budgetScore > 0
        ? `Project budget (€${projectBudgetMin}-€${projectBudgetMax}) aligns with your rate (€${userMinRate}-€${userMaxRate}/hr)`
        : `Project budget doesn't align with your hourly rate`
    });

    // Project type
    const typeScore = project.engagement_type === 'ongoing' ? 20 : 10;
    breakdown.factors.push({
      label: "Project Type",
      score: typeScore,
      max: 20,
      reason: project.engagement_type === 'ongoing' 
        ? "Long-term engagement matches most freelancers' preferences"
        : "One-time project"
    });

    // Recency
    const daysSincePosted = Math.floor(
      (Date.now() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const recencyScore = daysSincePosted < 3 ? 10 : daysSincePosted < 7 ? 5 : 0;
    breakdown.factors.push({
      label: "Recency",
      score: recencyScore,
      max: 10,
      reason: daysSincePosted < 3 
        ? "Posted within last 3 days - high urgency"
        : daysSincePosted < 7
        ? "Posted within last week"
        : "Posted over a week ago"
    });

    breakdown.total = breakdown.factors.reduce((sum, f) => sum + f.score, 0);
    return breakdown;
  };

  const matchBreakdown = calculateMatchBreakdown();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8 px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
            <div className="h-96 bg-muted rounded" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8 px-4">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
              <p className="text-muted-foreground mb-6">
                This project may have been removed or is no longer available.
              </p>
              <Button onClick={() => navigate("/projects")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate("/projects")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {isFreelancer && matchBreakdown && (
                        <Badge 
                          className={`gap-1 ${
                            matchBreakdown.total >= 80 ? "bg-green-50 text-green-600 border-green-200" :
                            matchBreakdown.total >= 60 ? "bg-blue-50 text-blue-600 border-blue-200" :
                            matchBreakdown.total >= 40 ? "bg-yellow-50 text-yellow-600 border-yellow-200" :
                            "bg-gray-50 text-gray-600 border-gray-200"
                          }`}
                        >
                          <Sparkles className="h-3 w-3" />
                          {matchBreakdown.total}% Match
                        </Badge>
                      )}
                      {project.category && (
                        <Badge variant="secondary">{project.category}</Badge>
                      )}
                      <Badge variant="outline" className="capitalize">
                        {project.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-3xl mb-2">{project.title}</CardTitle>
                    <CardDescription className="text-base">
                      Posted {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                    </CardDescription>
                  </div>
                </div>

                {/* Key Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Budget</p>
                      <p className="font-semibold">
                        €{project.budget_min?.toLocaleString()} - €{project.budget_max?.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-semibold">
                        {project.timeline_weeks ? `${project.timeline_weeks} weeks` : "Flexible"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-semibold capitalize">{project.engagement_type}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-semibold capitalize">{project.remote_policy}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Project Description */}
            <Card>
              <CardHeader>
                <CardTitle>Project Description</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {project.description}
                </p>
              </CardContent>
            </Card>

            {/* Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Requirements & Skills</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {project.required_skills && project.required_skills.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Required Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {project.required_skills.map((skill: string) => (
                        <Badge key={skill} variant="default">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {project.preferred_skills && project.preferred_skills.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Nice to Have</h4>
                    <div className="flex flex-wrap gap-2">
                      {project.preferred_skills.map((skill: string) => (
                        <Badge key={skill} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {project.experience_level && (
                  <div>
                    <h4 className="font-medium mb-2">Experience Level</h4>
                    <Badge variant="secondary" className="capitalize">
                      {project.experience_level}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Match Breakdown - Only for freelancers */}
            {isFreelancer && matchBreakdown && (
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Why This Match?
                  </CardTitle>
                  <CardDescription>
                    Club AI analyzed your profile and calculated a {matchBreakdown.total}% match
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {matchBreakdown.factors.map((factor) => (
                    <div key={factor.label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{factor.label}</span>
                        <span className="text-muted-foreground">
                          {factor.score}/{factor.max} pts
                        </span>
                      </div>
                      <Progress value={(factor.score / factor.max) * 100} />
                      <p className="text-xs text-muted-foreground">{factor.reason}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Similar Projects */}
            {similarProjects && similarProjects.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-4">Similar Projects</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {similarProjects.slice(0, 2).map((similarProject: any) => (
                    <ProjectCard 
                      key={similarProject.id}
                      project={similarProject}
                      isFreelancer={isFreelancer}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply CTA */}
            {isFreelancer && (
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Ready to Apply?</CardTitle>
                  <CardDescription>
                    Submit your proposal and stand out with Club AI
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    className="w-full gap-2" 
                    size="lg"
                    onClick={() => navigate(`/projects/${projectId}/apply`)}
                  >
                    <Sparkles className="h-4 w-4" />
                    Apply Now
                  </Button>
                  
                  {matchBreakdown && matchBreakdown.total < 50 && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-xs">
                        <p className="font-medium text-yellow-900 mb-1">Lower Match Score</p>
                        <p className="text-yellow-700">
                          Your profile has a {matchBreakdown.total}% match. Consider highlighting relevant experience in your proposal.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Client Information */}
            {project.company && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    About the Client
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={project.company.logo_url} />
                      <AvatarFallback>
                        {project.company.name?.charAt(0) || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{project.company.name}</h4>
                      {project.company.industry && (
                        <p className="text-sm text-muted-foreground">{project.company.industry}</p>
                      )}
                    </div>
                  </div>

                  {project.company.description && (
                    <p className="text-sm text-muted-foreground">
                      {project.company.description}
                    </p>
                  )}

                  {project.company.size && (
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{project.company.size} employees</span>
                    </div>
                  )}

                  {project.company.website && (
                    <a 
                      href={project.company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Visit Website
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Project Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Project Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Proposals</span>
                  <span className="font-medium">{project.proposal_count || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Views</span>
                  <span className="font-medium">{project.view_count || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Bookmarks</span>
                  <span className="font-medium">{project.bookmark_count || 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
