import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, Filter, CheckSquare, Square } from "lucide-react";

interface Candidate {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  current_title: string | null;
  user_id: string | null;
}

interface CandidateSelectorTableProps {
  selectedCandidates: string[];
  onSelectionChange: (ids: string[]) => void;
  filterByHasAccount?: boolean | null;
}

export const CandidateSelectorTable = ({
  selectedCandidates,
  onSelectionChange,
  filterByHasAccount = null,
}: CandidateSelectorTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [jobFilter, setJobFilter] = useState<string>("all");

  // Fetch candidates
  const { data: candidates, isLoading } = useQuery({
    queryKey: ["bulk-candidates", jobFilter],
    queryFn: async () => {
      let query = supabase
        .from("candidate_profiles")
        .select("id, full_name, email, avatar_url, current_title, user_id")
        .order("full_name");

      if (jobFilter !== "all") {
        const { data: applications } = await supabase
          .from("applications")
          .select("candidate_id")
          .eq("job_id", jobFilter);
        
        const candidateIds = applications?.map(a => a.candidate_id).filter((id): id is string => Boolean(id)) || [];
        if (candidateIds.length > 0) {
          query = query.in("id", candidateIds);
        } else {
          return [];
        }
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data as Candidate[];
    },
  });

  // Fetch jobs for filter
  const { data: jobs } = useQuery({
    queryKey: ["bulk-jobs-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, companies(name)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    if (!candidates) return [];
    
    return candidates.filter((c) => {
      // Search filter
      const matchesSearch = 
        c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.current_title?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Account filter
      let matchesAccount = true;
      if (filterByHasAccount === true) {
        matchesAccount = !!c.user_id;
      } else if (filterByHasAccount === false) {
        matchesAccount = !c.user_id;
      }
      
      return matchesSearch && matchesAccount;
    });
  }, [candidates, searchTerm, filterByHasAccount]);

  const handleSelectAll = () => {
    if (selectedCandidates.length === filteredCandidates.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredCandidates.map((c) => c.id));
    }
  };

  const handleToggleCandidate = (id: string) => {
    if (selectedCandidates.includes(id)) {
      onSelectionChange(selectedCandidates.filter((cid) => cid !== id));
    } else {
      onSelectionChange([...selectedCandidates, id]);
    }
  };

  const allSelected = filteredCandidates.length > 0 && 
    selectedCandidates.length === filteredCandidates.length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={jobFilter} onValueChange={setJobFilter}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by job" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Candidates</SelectItem>
            {jobs?.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.title} - {(job.companies as any)?.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selection summary */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {selectedCandidates.length} of {filteredCandidates.length} selected
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSelectAll}
          className="gap-2"
        >
          {allSelected ? (
            <>
              <Square className="h-4 w-4" />
              Deselect All
            </>
          ) : (
            <>
              <CheckSquare className="h-4 w-4" />
              Select All
            </>
          )}
        </Button>
      </div>

      {/* Virtualized Candidates list */}
      <VirtualizedCandidateList
        candidates={filteredCandidates}
        selectedCandidates={selectedCandidates}
        onToggle={handleToggleCandidate}
      />
    </div>
  );
};

// Extracted virtualized list component
function VirtualizedCandidateList({
  candidates,
  selectedCandidates,
  onToggle,
}: {
  candidates: Candidate[];
  selectedCandidates: string[];
  onToggle: (id: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: candidates.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });

  if (candidates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No candidates found
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="max-h-[400px] overflow-y-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const candidate = candidates[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="pb-2"
            >
              <div
                className={`flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedCandidates.includes(candidate.id)
                    ? "bg-primary/10 border-primary/30"
                    : "bg-card hover:bg-muted/50"
                }`}
                onClick={() => onToggle(candidate.id)}
              >
                <Checkbox
                  checked={selectedCandidates.includes(candidate.id)}
                  onCheckedChange={() => onToggle(candidate.id)}
                />
                <Avatar className="h-10 w-10">
                  <AvatarImage src={candidate.avatar_url || undefined} />
                  <AvatarFallback>
                    {candidate.full_name?.substring(0, 2).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{candidate.full_name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {candidate.email}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  {candidate.current_title && (
                    <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                      {candidate.current_title}
                    </span>
                  )}
                  {candidate.user_id ? (
                    <Badge variant="outline" className="text-xs">
                      Has Account
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      No Account
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
