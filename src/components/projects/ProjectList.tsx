import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProjectCard } from "./ProjectCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface ProjectListProps {
  userRole?: string;
  isFreelancer: boolean;
}

export function ProjectList({ userRole, isFreelancer }: ProjectListProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("match_score");

  // Fetch user's freelance categories for matching
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile-categories", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("freelance_categories, freelance_hourly_rate_min, freelance_hourly_rate_max")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && isFreelancer,
  });

  const { data: projects, isLoading } = useQuery({
    queryKey: ["marketplace-projects", "open"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("marketplace_projects")
        .select(`
          *,
          company:companies(name, logo_url)
        `)
        .eq("status", "open")
        .eq("visibility", "public")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  // Calculate match scores for freelancers
  const projectsWithMatches = projects?.map(project => {
    if (!isFreelancer || !userProfile?.freelance_categories) {
      return { ...project, matchScore: 0 };
    }

    let score = 0;
    
    // Category match (40 points max)
    const categoryMatches = userProfile.freelance_categories.filter(
      (cat: string) => project.required_skills?.includes(cat)
    ).length;
    score += Math.min(categoryMatches * 10, 40);
    
    // Budget match (30 points max)
    const userMinRate = userProfile.freelance_hourly_rate_min || 0;
    const userMaxRate = userProfile.freelance_hourly_rate_max || 999999;
    const projectBudgetMin = project.budget_min || 0;
    const projectBudgetMax = project.budget_max || 999999;
    
    if (projectBudgetMax >= userMinRate && projectBudgetMin <= userMaxRate) {
      score += 30;
    }
    
    // Project type match (20 points)
    if (project.engagement_type === 'ongoing') score += 10;
    
    // Recent posting (10 points)
    const daysSincePosted = Math.floor(
      (Date.now() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSincePosted < 3) score += 10;
    
    return { ...project, matchScore: Math.min(score, 100) };
  });

  const filteredProjects = projectsWithMatches?.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || 
      project.required_skills?.some((skill: string) => skill === categoryFilter);

    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === "match_score") return (b.matchScore || 0) - (a.matchScore || 0);
    if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === "budget") return (b.budget_max || 0) - (a.budget_max || 0);
    return 0;
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-80 bg-card border rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Matching Banner */}
      {isFreelancer && userProfile?.freelance_categories?.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Club AI Matching Active</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Projects are ranked by match score based on your categories, rates, and preferences. 
            Top matches appear first.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Development">Development</SelectItem>
            <SelectItem value="Design">Design</SelectItem>
            <SelectItem value="Marketing">Marketing</SelectItem>
            <SelectItem value="Strategy">Strategy</SelectItem>
            <SelectItem value="Writing">Writing</SelectItem>
            <SelectItem value="Data Science">Data Science</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="match_score">Best Match</SelectItem>
            <SelectItem value="budget_high">Highest Budget</SelectItem>
            <SelectItem value="budget_low">Lowest Budget</SelectItem>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="deadline">Deadline Soon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Project Grid */}
      {filteredProjects && filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              isFreelancer={isFreelancer}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No projects found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
