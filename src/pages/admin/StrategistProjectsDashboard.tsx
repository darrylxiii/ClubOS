import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
// import { formatDistanceToNow } from "date-fns";
import {
  Briefcase, Users, DollarSign, Clock, Search,
  CheckCircle2, Send, Sparkles, Eye,
  UserPlus, Loader2, Target
} from "lucide-react";

interface MarketplaceProject {
  id: string;
  title: string;
  description: string;
  category: string;
  budget_min: number;
  budget_max: number;
  timeline_weeks: number;
  required_skills: string[];
  status: string;
  created_at: string;
  client: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  proposals_count?: number;
}

interface FreelanceProfile {
  user_id: string;
  headline: string;
  hourly_rate: number;
  skills: string[];
  average_rating: number;
  total_projects_completed: number;
  profile: {
    full_name: string;
    avatar_url: string;
  };
}

export default function StrategistProjectsDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<MarketplaceProject | null>(null);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [selectedFreelancers, setSelectedFreelancers] = useState<string[]>([]);
  const [placementNotes, setPlacementNotes] = useState("");

  // Fetch open projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["strategist-projects", activeTab, searchQuery],
    queryFn: async () => {
      let query = (supabase as any)
        .from("marketplace_projects")
        .select(`
          *,
          client:profiles!marketplace_projects_client_id_fkey(id, full_name, avatar_url)
        `)
        .order("created_at", { ascending: false });

      if (activeTab === "open") {
        query = query.eq("status", "open");
      } else if (activeTab === "matched") {
        query = query.eq("status", "active");
      }

      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as MarketplaceProject[];
    },
  });

  // Fetch freelancers for matching
  const { data: freelancers } = useQuery({
    queryKey: ["available-freelancers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("freelance_profiles")
        .select(`
          *,
          profile:profiles!freelance_profiles_user_id_fkey(full_name, avatar_url)
        `)
        .eq("availability_status", "available")
        .order("average_rating", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as FreelanceProfile[];
    },
    enabled: matchDialogOpen,
  });

  // Create placement
  const placementMutation = useMutation({
    mutationFn: async (data: { projectId: string; freelancerIds: string[]; notes: string }) => {
      const placements = data.freelancerIds.map(freelancerId => ({
        strategist_id: user?.id,
        project_id: data.projectId,
        freelancer_id: freelancerId,
        placement_type: "curated",
        notes: data.notes,
        status: "shortlisted",
      }));

      const { error } = await (supabase as any)
        .from("strategist_placements")
        .insert(placements);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Freelancers added to shortlist");
      queryClient.invalidateQueries({ queryKey: ["strategist-projects"] });
      setMatchDialogOpen(false);
      setSelectedFreelancers([]);
      setPlacementNotes("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleFreelancerSelection = (id: string) => {
    setSelectedFreelancers(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const getSkillMatch = (projectSkills: string[], freelancerSkills: string[]) => {
    const matches = projectSkills.filter(s =>
      freelancerSkills.some(fs => fs.toLowerCase().includes(s.toLowerCase()))
    );
    return Math.round((matches.length / projectSkills.length) * 100);
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Target className="h-8 w-8" />
            Strategist Matching Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Curate perfect freelancer matches for client projects
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Briefcase className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{projects?.filter(p => p.status === "open").length || 0}</p>
                <p className="text-xs text-muted-foreground">Open Projects</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{freelancers?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Available Talent</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Placements This Month</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <DollarSign className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">€0</p>
                <p className="text-xs text-muted-foreground">Commission Earned</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search and Tabs */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="matched">Matched</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projectsLoading ? (
            [...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-6 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-4 bg-muted rounded w-1/2 mb-4" />
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))
          ) : projects && projects.length > 0 ? (
            projects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{project.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={project.client?.avatar_url} />
                          <AvatarFallback>{project.client?.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {project.client?.full_name}
                      </CardDescription>
                    </div>
                    <Badge variant={project.status === "open" ? "default" : "secondary"}>
                      {project.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {project.required_skills?.slice(0, 4).map((skill, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                    ))}
                    {project.required_skills?.length > 4 && (
                      <Badge variant="outline" className="text-xs">+{project.required_skills.length - 4}</Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      €{project.budget_min?.toLocaleString()} - €{project.budget_max?.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {project.timeline_weeks}w
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedProject(project)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        setSelectedProject(project);
                        setMatchDialogOpen(true);
                      }}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Match
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-2">
              <CardContent className="py-12 text-center">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No projects found</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Match Dialog */}
        <Dialog open={matchDialogOpen} onOpenChange={setMatchDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Match Freelancers to Project</DialogTitle>
            </DialogHeader>

            {selectedProject && (
              <div className="space-y-4">
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <h4 className="font-semibold">{selectedProject.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Required: {selectedProject.required_skills?.join(", ")}
                    </p>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <h4 className="font-medium">Select Freelancers ({selectedFreelancers.length} selected)</h4>
                  <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                    {freelancers?.map((freelancer) => {
                      const matchScore = getSkillMatch(
                        selectedProject.required_skills || [],
                        freelancer.skills || []
                      );
                      const isSelected = selectedFreelancers.includes(freelancer.user_id);

                      return (
                        <div
                          key={freelancer.user_id}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                            }`}
                          onClick={() => toggleFreelancerSelection(freelancer.user_id)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={freelancer.profile?.avatar_url} />
                              <AvatarFallback>{freelancer.profile?.full_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{freelancer.profile?.full_name}</p>
                              <p className="text-sm text-muted-foreground">{freelancer.headline}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={matchScore >= 70 ? "default" : "secondary"}>
                              <Sparkles className="h-3 w-3 mr-1" />
                              {matchScore}% match
                            </Badge>
                            <span className="text-sm">€{freelancer.hourly_rate}/hr</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Notes for Shortlist</h4>
                  <Textarea
                    placeholder="Add notes about why you're recommending these freelancers..."
                    value={placementNotes}
                    onChange={(e) => setPlacementNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setMatchDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedProject) {
                    placementMutation.mutate({
                      projectId: selectedProject.id,
                      freelancerIds: selectedFreelancers,
                      notes: placementNotes,
                    });
                  }
                }}
                disabled={selectedFreelancers.length === 0 || placementMutation.isPending}
              >
                {placementMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Shortlist ({selectedFreelancers.length})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
