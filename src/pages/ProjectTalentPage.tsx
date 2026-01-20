import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Users, Star, MapPin, DollarSign, Filter, Mail } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface FreelancerProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  location: string | null;
  current_title: string | null;
  bio: string | null;
  skills: string[] | null;
  freelance_hourly_rate_min: number | null;
  freelance_availability_status: string | null;
}

export default function ProjectTalentPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [skillFilter, setSkillFilter] = useState<string>("");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("");

  const { data: freelancers, isLoading } = useQuery({
    queryKey: ["project-talent", searchQuery, skillFilter, availabilityFilter],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, full_name, avatar_url, location, current_title, bio, skills, freelance_hourly_rate_min, freelance_availability_status")
        .eq("open_to_freelance_work", true);

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,current_title.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`);
      }

      if (availabilityFilter && availabilityFilter !== "all") {
        query = query.eq("freelance_availability_status", availabilityFilter);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;

      // Filter by skill if specified
      let filtered = data || [];
      if (skillFilter && skillFilter !== "all") {
        filtered = filtered.filter((f) => f.skills?.includes(skillFilter));
      }

      return filtered as FreelancerProfile[];
    },
  });

  // Get unique skills from all freelancers for the filter
  const allSkills = freelancers?.flatMap((f) => f.skills || []).filter((v, i, a) => a.indexOf(v) === i) || [];

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getAvailabilityColor = (status: string | null) => {
    switch (status) {
      case "available": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "partially_available": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "not_available": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Find Talent</h1>
          <p className="text-muted-foreground">Search and invite freelancers to your projects</p>
        </div>
        <Badge variant="outline" className="w-fit">
          <Users className="h-3 w-3 mr-1" />
          {freelancers?.length || 0} freelancers available
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, title, or bio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={skillFilter} onValueChange={setSkillFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by skill" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Skills</SelectItem>
                {allSkills.slice(0, 20).map((skill) => (
                  <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="partially_available">Partially Available</SelectItem>
                <SelectItem value="not_available">Not Available</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : freelancers?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No freelancers found</h3>
            <p className="text-muted-foreground mt-1">
              Try adjusting your search or filters
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {freelancers?.map((freelancer) => (
            <Card key={freelancer.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={freelancer.avatar_url || undefined} />
                    <AvatarFallback>{getInitials(freelancer.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium truncate">{freelancer.full_name || "Anonymous"}</h3>
                      <Badge variant="outline" className={getAvailabilityColor(freelancer.freelance_availability_status)}>
                        {freelancer.freelance_availability_status?.replace("_", " ") || "Unknown"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{freelancer.current_title || "Freelancer"}</p>
                    
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {freelancer.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {freelancer.location}
                        </span>
                      )}
                      {freelancer.freelance_hourly_rate_min && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          €{freelancer.freelance_hourly_rate_min}/hr
                        </span>
                      )}
                    </div>

                    {freelancer.skills && freelancer.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {freelancer.skills.slice(0, 3).map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {freelancer.skills.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{freelancer.skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <Button size="sm" className="flex-1">
                        <Mail className="h-3 w-3 mr-1" />
                        Invite
                      </Button>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
