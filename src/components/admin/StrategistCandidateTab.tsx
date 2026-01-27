import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, User, UserPlus, UserMinus, Loader2, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { useStrategistList, TeamMember } from "@/hooks/useStrategistWorkload";

interface CandidateWithStrategist {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  current_title: string | null;
  current_company: string | null;
  assigned_strategist_id: string | null;
  is_active: boolean;
  strategist: TeamMember | null;
}

export function StrategistCandidateTab() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [bulkStrategist, setBulkStrategist] = useState<string>("");

  const { data: strategists } = useStrategistList();

  // Fetch candidates with their assignments
  const { data: candidates, isLoading } = useQuery({
    queryKey: ['candidates-with-assignments', activeOnly],
    queryFn: async (): Promise<CandidateWithStrategist[]> => {
      // Build query based on filters
      const { data: candidatesData, error } = await supabase
        .from('candidate_profiles')
        .select('id, full_name, email, avatar_url, current_title, current_company, assigned_strategist_id')
        .order('full_name')
        .limit(500);

      if (error) throw error;

      // Fetch user_roles for admins and strategists
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'strategist']);

      const teamUserIds = [...new Set((roles || []).map(r => r.user_id))];

      // Fetch team member profiles for strategist display
      const { data: teamProfiles } = teamUserIds.length > 0 
        ? await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url, current_title')
            .in('id', teamUserIds)
        : { data: [] };

      // Map candidates with their strategist
      return candidatesData?.map(candidate => {
        const strategist = candidate.assigned_strategist_id
          ? teamProfiles?.find((p: any) => p.id === candidate.assigned_strategist_id)
          : null;
        
        return {
          id: candidate.id,
          full_name: candidate.full_name,
          email: candidate.email,
          avatar_url: candidate.avatar_url,
          current_title: candidate.current_title,
          current_company: candidate.current_company,
          assigned_strategist_id: candidate.assigned_strategist_id,
          is_active: true, // Default to true since we don't have this column
          strategist: strategist ? {
            id: strategist.id,
            full_name: strategist.full_name,
            email: strategist.email,
            avatar_url: strategist.avatar_url,
            current_title: strategist.current_title,
          } : null,
        };
      }) || [];
    },
  });

  // Assign strategist mutation
  const assignMutation = useMutation({
    mutationFn: async ({ candidateId, strategistId }: { candidateId: string; strategistId: string }) => {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ assigned_strategist_id: strategistId })
        .eq('id', candidateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates-with-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['strategist-workload'] });
      toast.success("Strategist assigned");
    },
    onError: () => {
      toast.error("Failed to assign strategist");
    },
  });

  // Remove assignment mutation
  const removeMutation = useMutation({
    mutationFn: async (candidateId: string) => {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ assigned_strategist_id: null })
        .eq('id', candidateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates-with-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['strategist-workload'] });
      toast.success("Assignment removed");
    },
    onError: () => {
      toast.error("Failed to remove assignment");
    },
  });

  // Bulk assign mutation
  const bulkAssignMutation = useMutation({
    mutationFn: async ({ candidateIds, strategistId }: { candidateIds: string[]; strategistId: string }) => {
      const { error } = await supabase
        .from('candidate_profiles')
        .update({ assigned_strategist_id: strategistId })
        .in('id', candidateIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidates-with-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['strategist-workload'] });
      setSelectedCandidates(new Set());
      setBulkStrategist("");
      toast.success("Bulk assignment completed");
    },
    onError: () => {
      toast.error("Failed to complete bulk assignment");
    },
  });

  const filteredCandidates = useMemo(() => {
    if (!candidates) return [];
    return candidates.filter(candidate => {
      const name = candidate.full_name || candidate.email || '';
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidate.current_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidate.current_company?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesUnassigned = !unassignedOnly || !candidate.strategist;
      return matchesSearch && matchesUnassigned;
    });
  }, [candidates, searchQuery, unassignedOnly]);

  const toggleCandidateSelection = (candidateId: string) => {
    const newSet = new Set(selectedCandidates);
    if (newSet.has(candidateId)) {
      newSet.delete(candidateId);
    } else {
      newSet.add(candidateId);
    }
    setSelectedCandidates(newSet);
  };

  const handleBulkAssign = () => {
    if (!bulkStrategist || selectedCandidates.size === 0) return;
    bulkAssignMutation.mutate({
      candidateIds: Array.from(selectedCandidates),
      strategistId: bulkStrategist,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={unassignedOnly}
            onCheckedChange={(checked) => setUnassignedOnly(checked as boolean)}
          />
          Unassigned Only
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={activeOnly}
            onCheckedChange={(checked) => setActiveOnly(checked as boolean)}
          />
          Active Only
        </label>
      </div>

      {/* Bulk Actions */}
      {selectedCandidates.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg border border-accent/20">
          <span className="text-sm font-medium">{selectedCandidates.size} selected</span>
          <Select value={bulkStrategist} onValueChange={setBulkStrategist}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select strategist..." />
            </SelectTrigger>
            <SelectContent>
              {strategists?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleBulkAssign}
            disabled={!bulkStrategist || bulkAssignMutation.isPending}
          >
            {bulkAssignMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <UserPlus className="h-4 w-4 mr-1" />
            )}
            Assign All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedCandidates(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Candidate List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {filteredCandidates.map((candidate) => (
            <div
              key={candidate.id}
              className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:bg-accent/5 transition-colors"
            >
              <Checkbox
                checked={selectedCandidates.has(candidate.id)}
                onCheckedChange={() => toggleCandidateSelection(candidate.id)}
              />
              
              <Avatar className="h-10 w-10">
                <AvatarImage src={candidate.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{candidate.full_name || candidate.email}</p>
                {candidate.current_title && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {candidate.current_title}
                    {candidate.current_company && ` at ${candidate.current_company}`}
                  </p>
                )}
              </div>

              {/* Status */}
              {!candidate.is_active && (
                <Badge variant="secondary" className="text-xs">Inactive</Badge>
              )}

              {/* Current Strategist */}
              <div className="flex items-center gap-2">
                {candidate.strategist ? (
                  <>
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={candidate.strategist.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {candidate.strategist.full_name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{candidate.strategist.full_name}</span>
                  </>
                ) : (
                  <Badge variant="secondary" className="text-xs">Unassigned</Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Select
                  value={candidate.assigned_strategist_id || ""}
                  onValueChange={(value) => {
                    if (value) {
                      assignMutation.mutate({ candidateId: candidate.id, strategistId: value });
                    }
                  }}
                >
                  <SelectTrigger className="w-[150px] h-8">
                    <SelectValue placeholder="Assign..." />
                  </SelectTrigger>
                  <SelectContent>
                    {strategists?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {candidate.strategist && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeMutation.mutate(candidate.id)}
                    disabled={removeMutation.isPending}
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {filteredCandidates.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No candidates found
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Summary */}
      <div className="flex justify-between text-sm text-muted-foreground pt-2 border-t">
        <span>{filteredCandidates.length} candidates (showing max 500)</span>
        <span>
          {filteredCandidates.filter(c => c.strategist).length} assigned •{' '}
          {filteredCandidates.filter(c => !c.strategist).length} unassigned
        </span>
      </div>
    </div>
  );
}
