import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface KPIOwnership {
  id: string;
  kpi_name: string;
  domain: string;
  category: string;
  owner_user_id: string | null;
  owner_role: string | null;
  backup_owner_id: string | null;
  review_frequency: string;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  created_at: string;
  updated_at: string;
  owner_profile?: {
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
  backup_owner_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface KPITarget {
  id: string;
  kpi_name: string;
  target_value: number | null;
  warning_threshold: number | null;
  critical_threshold: number | null;
  lower_is_better: boolean;
  period_type: string;
  set_by: string | null;
  effective_from: string;
  notes: string | null;
  created_at: string;
}

export interface KPIImprovementAction {
  id: string;
  kpi_name: string;
  owner_id: string | null;
  action_description: string;
  action_type: string;
  due_date: string | null;
  status: string;
  outcome_notes: string | null;
  created_at: string;
  completed_at: string | null;
  owner_profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useKPIOwnership() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: ownerships, isLoading: loadingOwnerships } = useQuery({
    queryKey: ['kpi-ownerships'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_ownership')
        .select('*')
        .order('domain', { ascending: true });
      
      if (error) throw error;
      return (data || []) as KPIOwnership[];
    },
  });

  const { data: myOwnerships } = useQuery({
    queryKey: ['my-kpi-ownerships', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_ownership')
        .select('*')
        .or(`owner_user_id.eq.${user.id},backup_owner_id.eq.${user.id}`);
      
      if (error) throw error;
      return data as KPIOwnership[];
    },
    enabled: !!user?.id,
  });

  const assignOwnerMutation = useMutation({
    mutationFn: async ({ 
      kpiName, 
      domain, 
      category, 
      ownerUserId, 
      ownerRole,
      backupOwnerId,
      reviewFrequency 
    }: { 
      kpiName: string; 
      domain: string; 
      category: string;
      ownerUserId?: string; 
      ownerRole?: string;
      backupOwnerId?: string;
      reviewFrequency?: string;
    }) => {
      // Check if ownership already exists
      const { data: existing } = await supabase
        .from('kpi_ownership')
        .select('id')
        .eq('kpi_name', kpiName)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('kpi_ownership')
          .update({
            owner_user_id: ownerUserId || null,
            owner_role: ownerRole || null,
            backup_owner_id: backupOwnerId || null,
            review_frequency: reviewFrequency || 'weekly',
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('kpi_ownership')
          .insert({
            kpi_name: kpiName,
            domain,
            category,
            owner_user_id: ownerUserId || null,
            owner_role: ownerRole || null,
            backup_owner_id: backupOwnerId || null,
            review_frequency: reviewFrequency || 'weekly',
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-ownerships'] });
      toast.success('KPI ownership updated');
    },
    onError: (error) => {
      toast.error('Failed to update ownership: ' + error.message);
    },
  });

  const markReviewedMutation = useMutation({
    mutationFn: async (ownershipId: string) => {
      const { error } = await supabase
        .from('kpi_ownership')
        .update({
          last_reviewed_at: new Date().toISOString(),
          next_review_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 days
        })
        .eq('id', ownershipId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-ownerships'] });
      toast.success('Marked as reviewed');
    },
  });

  const getOwnerForKPI = (kpiName: string): KPIOwnership | undefined => {
    return ownerships?.find(o => o.kpi_name === kpiName);
  };

  return {
    ownerships,
    myOwnerships,
    loadingOwnerships,
    assignOwner: assignOwnerMutation.mutate,
    markReviewed: markReviewedMutation.mutate,
    getOwnerForKPI,
    isAssigning: assignOwnerMutation.isPending,
  };
}

export function useKPIActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: actions, isLoading: loadingActions } = useQuery({
    queryKey: ['kpi-actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_improvement_actions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as KPIImprovementAction[];
    },
  });

  const { data: myActions } = useQuery({
    queryKey: ['my-kpi-actions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('kpi_improvement_actions')
        .select('*')
        .eq('owner_id', user.id)
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return (data || []) as KPIImprovementAction[];
    },
    enabled: !!user?.id,
  });

  const { data: pendingActions } = useQuery({
    queryKey: ['pending-kpi-actions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_improvement_actions')
        .select('*')
        .in('status', ['pending', 'in_progress'])
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return (data || []) as KPIImprovementAction[];
    },
  });

  const createActionMutation = useMutation({
    mutationFn: async ({ 
      kpiName, 
      ownerId,
      actionDescription, 
      actionType,
      dueDate 
    }: { 
      kpiName: string; 
      ownerId: string;
      actionDescription: string;
      actionType: string;
      dueDate?: string;
    }) => {
      const { error } = await supabase
        .from('kpi_improvement_actions')
        .insert([{
          kpi_name: kpiName,
          owner_id: ownerId,
          action_description: actionDescription,
          action_type: actionType,
          due_date: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
          domain: 'operations', // default domain
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-actions'] });
      queryClient.invalidateQueries({ queryKey: ['pending-kpi-actions'] });
      toast.success('Action plan created');
    },
    onError: (error) => {
      toast.error('Failed to create action: ' + error.message);
    },
  });

  const updateActionMutation = useMutation({
    mutationFn: async ({ 
      actionId, 
      status, 
      outcomeNotes 
    }: { 
      actionId: string; 
      status: string;
      outcomeNotes?: string;
    }) => {
      const updates: Record<string, unknown> = { status };
      if (outcomeNotes) updates.outcome_notes = outcomeNotes;
      if (status === 'completed') updates.completed_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('kpi_improvement_actions')
        .update(updates)
        .eq('id', actionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-actions'] });
      queryClient.invalidateQueries({ queryKey: ['pending-kpi-actions'] });
      queryClient.invalidateQueries({ queryKey: ['my-kpi-actions'] });
      toast.success('Action updated');
    },
  });

  const getActionsForKPI = (kpiName: string): KPIImprovementAction[] => {
    return actions?.filter(a => a.kpi_name === kpiName) || [];
  };

  return {
    actions,
    myActions,
    pendingActions,
    loadingActions,
    createAction: createActionMutation.mutate,
    updateAction: updateActionMutation.mutate,
    getActionsForKPI,
    isCreating: createActionMutation.isPending,
  };
}

// Role-based KPI domain mapping
export const roleKPIDomains: Record<string, string[]> = {
  admin: ['operations', 'website', 'sales', 'platform', 'intelligence', 'growth', 'costs'],
  strategist: ['operations', 'sales', 'intelligence', 'platform'],
  partner: ['pipeline', 'hiring', 'operations'],
  recruiter: ['operations', 'pipeline'],
  user: ['engagement', 'activity'],
};

export function useRoleBasedKPIs(userRole: string | null) {
  const allowedDomains = userRole ? roleKPIDomains[userRole] || roleKPIDomains.user : [];
  
  return {
    allowedDomains,
    canViewDomain: (domain: string) => allowedDomains.includes(domain.toLowerCase()),
    canManageKPIs: userRole === 'admin' || userRole === 'strategist',
  };
}
