import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Search, Filter, Star, MapPin, Clock, DollarSign,
  Sparkles, Heart, MessageSquare, UserPlus, ChevronDown,
  Award, Briefcase, Globe, CheckCircle2, X
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const SKILL_FILTERS = [
  "React", "TypeScript", "Node.js", "Python", "AWS", "UI/UX Design",
  "Mobile Development", "DevOps", "Data Science", "Machine Learning",
];

const AVAILABILITY_OPTIONS = [
  { value: "available", label: "Available Now" },
  { value: "busy", label: "Limited Availability" },
  { value: "booked", label: "Currently Booked" },
];

interface FreelancerProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  current_title: string;
  bio: string;
  freelance_categories: string[];
  freelance_hourly_rate_min: number;
  freelance_hourly_rate_max: number;
  freelance_availability_status: string;
  location: string;
  freelance_profile?: {
    avg_project_rating: number;
    total_completed_projects: number;
    talent_level: string;
    job_success_score: number;
    availability_hours_per_week: number;
  };
}

export function TalentDiscovery() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [rateRange, setRateRange] = useState([0, 300]);
  const [availability, setAvailability] = useState("all");
  const [talentLevel, setTalentLevel] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: freelancers, isLoading } = useQuery({
    queryKey: ["talent-discovery", searchQuery, selectedSkills, rateRange, availability, talentLevel],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select(`
          id, full_name, avatar_url, current_title, bio,
          freelance_categories, freelance_hourly_rate_min, 
          freelance_hourly_rate_max, freelance_availability_status, location
        `)
        .eq("open_to_freelance_work", true);

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%,current_title.ilike.%${searchQuery}%`);
      }

      if (availability !== "all") {
        query = query.eq("freelance_availability_status", availability);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;

      // Filter by skills client-side (since it's an array column)
      let filtered = data || [];
      if (selectedSkills.length > 0) {
        filtered = filtered.filter((f: any) => 
          selectedSkills.some(skill => f.freelance_categories?.includes(skill))
        );
      }

      // Filter by rate range
      filtered = filtered.filter((f: any) => {
        const minRate = f.freelance_hourly_rate_min || 0;
        return minRate >= rateRange[0] && minRate <= rateRange[1];
      });

      return filtered as FreelancerProfile[];
    },
  });

  const { data: savedFreelancers } = useQuery({
    queryKey: ["saved-freelancers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("saved_freelancers")
        .select("freelancer_id")
        .eq("client_id", user.id);
      return data?.map((s: any) => s.freelancer_id) || [];
    },
    enabled: !!user?.id,
  });

  const saveFreelancerMutation = useMutation({
    mutationFn: async (freelancerId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const isSaved = savedFreelancers?.includes(freelancerId);
      
      if (isSaved) {
        await supabase
          .from("saved_freelancers")
          .delete()
          .eq("client_id", user.id)
          .eq("freelancer_id", freelancerId);
      } else {
        await supabase
          .from("saved_freelancers")
          .insert({ client_id: user.id, freelancer_id: freelancerId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-freelancers"] });
    },
  });

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const getTalentBadge = (level: string) => {
    switch (level) {
      case "top_rated_plus":
        return (
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white gap-1">
            <Award className="h-3 w-3" />
            Top Rated Plus
          </Badge>
        );
      case "top_rated":
        return (
          <Badge className="bg-gradient-to-r from-primary to-primary/80 gap-1">
            <Award className="h-3 w-3" />
            Top Rated
          </Badge>
        );
      case "rising_star":
        return (
          <Badge variant="secondary" className="gap-1">
            <Star className="h-3 w-3" />
            Rising Star
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Find Talent
          </h2>
          <p className="text-muted-foreground">
            Discover verified freelancers matched to your needs
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, skill, or keyword..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {(selectedSkills.length > 0 || availability !== "all") && (
                <Badge variant="secondary" className="ml-1">
                  {selectedSkills.length + (availability !== "all" ? 1 : 0)}
                </Badge>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
              {/* Skills */}
              <div>
                <p className="text-sm font-medium mb-3">Skills</p>
                <div className="flex flex-wrap gap-2">
                  {SKILL_FILTERS.map((skill) => (
                    <Badge
                      key={skill}
                      variant={selectedSkills.includes(skill) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleSkill(skill)}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Rate Range */}
              <div>
                <p className="text-sm font-medium mb-3">
                  Hourly Rate: €{rateRange[0]} - €{rateRange[1]}
                </p>
                <Slider
                  value={rateRange}
                  onValueChange={setRateRange}
                  min={0}
                  max={300}
                  step={10}
                />
              </div>

              {/* Availability */}
              <div>
                <p className="text-sm font-medium mb-3">Availability</p>
                <Select value={availability} onValueChange={setAvailability}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {AVAILABILITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Active Filters */}
          {(selectedSkills.length > 0 || availability !== "all") && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedSkills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1">
                  {skill}
                  <button onClick={() => toggleSkill(skill)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {availability !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {AVAILABILITY_OPTIONS.find(o => o.value === availability)?.label}
                  <button onClick={() => setAvailability("all")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedSkills([]);
                  setAvailability("all");
                  setRateRange([0, 300]);
                }}
              >
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : freelancers && freelancers.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground">
            {freelancers.length} freelancers found
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {freelancers.map((freelancer) => (
              <FreelancerCard
                key={freelancer.id}
                freelancer={freelancer}
                isSaved={savedFreelancers?.includes(freelancer.id) || false}
                onSave={() => saveFreelancerMutation.mutate(freelancer.id)}
                onView={() => navigate(`/profile/${freelancer.id}`)}
                onInvite={() => toast("Invite freelancer", { description: "Go to their profile to send a message and invite them to your project." })}
              />
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Freelancers Found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface FreelancerCardProps {
  freelancer: FreelancerProfile;
  isSaved: boolean;
  onSave: () => void;
  onView: () => void;
  onInvite: () => void;
}

function FreelancerCard({ freelancer, isSaved, onSave, onView, onInvite }: FreelancerCardProps) {
  const rating = freelancer.freelance_profile?.avg_project_rating || 0;
  const completedProjects = freelancer.freelance_profile?.total_completed_projects || 0;
  const talentLevel = freelancer.freelance_profile?.talent_level;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300">
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <Avatar className="h-16 w-16 ring-2 ring-background">
            <AvatarImage src={freelancer.avatar_url} />
            <AvatarFallback className="text-lg">
              {freelancer.full_name?.charAt(0) || "F"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{freelancer.full_name}</h3>
            <p className="text-sm text-muted-foreground truncate">
              {freelancer.current_title}
            </p>
            {talentLevel && (
              <div className="mt-1">
                {talentLevel === "top_rated_plus" && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
                    Top Rated Plus
                  </Badge>
                )}
                {talentLevel === "top_rated" && (
                  <Badge className="bg-primary text-xs">Top Rated</Badge>
                )}
              </div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave();
            }}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <Heart className={`h-5 w-5 ${isSaved ? "fill-red-500 text-red-500" : ""}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm mb-4">
          {rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-medium">{rating.toFixed(1)}</span>
            </div>
          )}
          {completedProjects > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              <span>{completedProjects} projects</span>
            </div>
          )}
        </div>

        {/* Rate */}
        <div className="flex items-center gap-2 text-sm mb-4">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">
            €{freelancer.freelance_hourly_rate_min || 0} - €{freelancer.freelance_hourly_rate_max || 0}
          </span>
          <span className="text-muted-foreground">/hour</span>
        </div>

        {/* Skills */}
        {freelancer.freelance_categories && freelancer.freelance_categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {freelancer.freelance_categories.slice(0, 4).map((skill: string) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
            {freelancer.freelance_categories.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{freelancer.freelance_categories.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Availability */}
        <div className="flex items-center gap-2 text-sm mb-4">
          {freelancer.freelance_availability_status === "available" ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-green-600">Available now</span>
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Limited availability</span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
            View Profile
          </Button>
          <Button size="sm" className="flex-1 gap-1" onClick={onInvite}>
            <UserPlus className="h-4 w-4" />
            Invite
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
