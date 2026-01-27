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
import { Search, Building2, UserPlus, UserMinus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useStrategistList, TeamMember } from "@/hooks/useStrategistWorkload";

interface CompanyWithAssignment {
  id: string;
  name: string;
  logo_url: string | null;
  industry: string | null;
  assignment: any | null;
  strategist: TeamMember | null;
}

export function StrategistCompanyTab() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());
  const [bulkStrategist, setBulkStrategist] = useState<string>("");

  const { data: strategists } = useStrategistList();

  // Fetch companies with their assignments
  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies-with-assignments'],
    queryFn: async (): Promise<CompanyWithAssignment[]> => {
      const { data: allCompanies, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, logo_url, industry')
        .eq('is_active', true)
        .is('archived_at', null)
        .order('name');

      if (companiesError) throw companiesError;

      const { data: assignments, error: assignmentsError } = await supabase
        .from('company_strategist_assignments')
        .select('*')
        .eq('is_active', true);

      if (assignmentsError) throw assignmentsError;

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

      // Map companies with their assignments
      return allCompanies?.map(company => {
        const assignment = assignments?.find(a => a.company_id === company.id);
        const strategist = assignment 
          ? teamProfiles?.find((p: any) => p.id === assignment.strategist_id)
          : null;
        
        return {
          id: company.id,
          name: company.name,
          logo_url: company.logo_url,
          industry: company.industry,
          assignment,
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
    mutationFn: async ({ companyId, strategistId }: { companyId: string; strategistId: string }) => {
      // Check if assignment exists
      const { data: existing } = await supabase
        .from('company_strategist_assignments')
        .select('id')
        .eq('company_id', companyId)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('company_strategist_assignments')
          .update({ strategist_id: strategistId, is_active: true })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('company_strategist_assignments')
          .insert({
            company_id: companyId,
            strategist_id: strategistId,
            sla_response_days: 3,
            commission_split_percent: 20,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies-with-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['strategist-workload'] });
      toast.success("Strategist assigned successfully");
    },
    onError: (error) => {
      toast.error("Failed to assign strategist");
      console.error(error);
    },
  });

  // Remove assignment mutation
  const removeMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase
        .from('company_strategist_assignments')
        .update({ is_active: false })
        .eq('company_id', companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies-with-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['strategist-workload'] });
      toast.success("Assignment removed");
    },
    onError: () => {
      toast.error("Failed to remove assignment");
    },
  });

  // Bulk assign mutation
  const bulkAssignMutation = useMutation({
    mutationFn: async ({ companyIds, strategistId }: { companyIds: string[]; strategistId: string }) => {
      for (const companyId of companyIds) {
        const { data: existing } = await supabase
          .from('company_strategist_assignments')
          .select('id')
          .eq('company_id', companyId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('company_strategist_assignments')
            .update({ strategist_id: strategistId, is_active: true })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('company_strategist_assignments')
            .insert({
              company_id: companyId,
              strategist_id: strategistId,
              sla_response_days: 3,
              commission_split_percent: 20,
            });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies-with-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['strategist-workload'] });
      setSelectedCompanies(new Set());
      setBulkStrategist("");
      toast.success("Bulk assignment completed");
    },
    onError: () => {
      toast.error("Failed to complete bulk assignment");
    },
  });

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    return companies.filter(company => {
      const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.industry?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesUnassigned = !unassignedOnly || !company.strategist;
      return matchesSearch && matchesUnassigned;
    });
  }, [companies, searchQuery, unassignedOnly]);

  const toggleCompanySelection = (companyId: string) => {
    const newSet = new Set(selectedCompanies);
    if (newSet.has(companyId)) {
      newSet.delete(companyId);
    } else {
      newSet.add(companyId);
    }
    setSelectedCompanies(newSet);
  };

  const handleBulkAssign = () => {
    if (!bulkStrategist || selectedCompanies.size === 0) return;
    bulkAssignMutation.mutate({
      companyIds: Array.from(selectedCompanies),
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
            placeholder="Search companies..."
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
      </div>

      {/* Bulk Actions */}
      {selectedCompanies.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-accent/10 rounded-lg border border-accent/20">
          <span className="text-sm font-medium">{selectedCompanies.size} selected</span>
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
            onClick={() => setSelectedCompanies(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Company List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {filteredCompanies.map((company) => (
            <div
              key={company.id}
              className="flex items-center gap-4 p-3 rounded-lg border border-border/50 hover:bg-accent/5 transition-colors"
            >
              <Checkbox
                checked={selectedCompanies.has(company.id)}
                onCheckedChange={() => toggleCompanySelection(company.id)}
              />
              
              <Avatar className="h-10 w-10">
                <AvatarImage src={company.logo_url || undefined} />
                <AvatarFallback>
                  <Building2 className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{company.name}</p>
                {company.industry && (
                  <p className="text-xs text-muted-foreground">{company.industry}</p>
                )}
              </div>

              {/* Current Strategist */}
              <div className="flex items-center gap-2">
                {company.strategist ? (
                  <>
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={company.strategist.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {company.strategist.full_name?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{company.strategist.full_name}</span>
                    {company.assignment?.sla_config && (
                      <Badge variant="outline" className="text-xs">
                        SLA
                      </Badge>
                    )}
                  </>
                ) : (
                  <Badge variant="secondary" className="text-xs">Unassigned</Badge>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Select
                  value={company.strategist?.id || ""}
                  onValueChange={(value) => {
                    if (value) {
                      assignMutation.mutate({ companyId: company.id, strategistId: value });
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

                {company.strategist && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeMutation.mutate(company.id)}
                    disabled={removeMutation.isPending}
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {filteredCompanies.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No companies found
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Summary */}
      <div className="flex justify-between text-sm text-muted-foreground pt-2 border-t">
        <span>{filteredCompanies.length} companies</span>
        <span>
          {filteredCompanies.filter(c => c.strategist).length} assigned •{' '}
          {filteredCompanies.filter(c => !c.strategist).length} unassigned
        </span>
      </div>
    </div>
  );
}
