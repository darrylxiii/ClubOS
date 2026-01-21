import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ProjectContract, ProjectMilestone } from '@/types/projects';

export interface ContractInvoice {
  id: string;
  contract_id: string;
  milestone_ids: string[];
  invoice_number: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string | null;
  paid_at: string | null;
  pdf_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface ContractChangeOrder {
  id: string;
  contract_id: string;
  requested_by: string;
  scope_change: string | null;
  budget_impact: number;
  timeline_impact_days: number;
  justification: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn';
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface DeadlineAlert {
  id: string;
  contract_id: string;
  milestone_id: string | null;
  alert_type: 'approaching' | 'breached' | 'cleared';
  sent_at: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export function usePartnerContracts(companyId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch contracts for partner's company
  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['partner-contracts', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('project_contracts')
        .select(`
          *,
          project_milestones(*)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as (ProjectContract & { project_milestones: ProjectMilestone[] })[];
    },
    enabled: !!companyId
  });

  // Fetch invoices
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['contract-invoices', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const contractIds = contracts.map(c => c.id);
      if (contractIds.length === 0) return [];

      const { data, error } = await supabase
        .from('contract_invoices')
        .select('*')
        .in('contract_id', contractIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ContractInvoice[];
    },
    enabled: !!companyId && contracts.length > 0
  });

  // Fetch change orders
  const { data: changeOrders = [], isLoading: changeOrdersLoading } = useQuery({
    queryKey: ['contract-change-orders', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const contractIds = contracts.map(c => c.id);
      if (contractIds.length === 0) return [];

      const { data, error } = await supabase
        .from('contract_change_orders')
        .select('*')
        .in('contract_id', contractIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ContractChangeOrder[];
    },
    enabled: !!companyId && contracts.length > 0
  });

  // Fetch deadline alerts
  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['contract-deadline-alerts', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const contractIds = contracts.map(c => c.id);
      if (contractIds.length === 0) return [];

      const { data, error } = await supabase
        .from('contract_deadline_alerts')
        .select('*')
        .in('contract_id', contractIds)
        .is('acknowledged_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DeadlineAlert[];
    },
    enabled: !!companyId && contracts.length > 0
  });

  // Create invoice mutation
  const createInvoice = useMutation({
    mutationFn: async (data: {
      contract_id: string;
      milestone_ids: string[];
      amount: number;
      tax_amount?: number;
      due_date?: string;
      notes?: string;
    }) => {
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const totalAmount = data.amount + (data.tax_amount || 0);

      const { error } = await supabase
        .from('contract_invoices')
        .insert({
          contract_id: data.contract_id,
          milestone_ids: data.milestone_ids,
          invoice_number: invoiceNumber,
          amount: data.amount,
          tax_amount: data.tax_amount || 0,
          total_amount: totalAmount,
          due_date: data.due_date,
          notes: data.notes,
          created_by: user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-invoices'] });
      toast.success('Invoice created');
    },
    onError: (error) => toast.error('Failed to create invoice: ' + error.message)
  });

  // Create change order mutation
  const createChangeOrder = useMutation({
    mutationFn: async (data: {
      contract_id: string;
      scope_change: string;
      budget_impact: number;
      timeline_impact_days: number;
      justification: string;
    }) => {
      const { error } = await supabase
        .from('contract_change_orders')
        .insert({
          ...data,
          requested_by: user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-change-orders'] });
      toast.success('Change order submitted');
    },
    onError: (error) => toast.error('Failed to submit change order: ' + error.message)
  });

  // Approve change order
  const approveChangeOrder = useMutation({
    mutationFn: async (changeOrderId: string) => {
      const { error } = await supabase
        .from('contract_change_orders')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', changeOrderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-change-orders'] });
      toast.success('Change order approved');
    }
  });

  // Reject change order
  const rejectChangeOrder = useMutation({
    mutationFn: async ({ changeOrderId, reason }: { changeOrderId: string; reason: string }) => {
      const { error } = await supabase
        .from('contract_change_orders')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', changeOrderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-change-orders'] });
      toast.success('Change order rejected');
    }
  });

  // Acknowledge alert
  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('contract_deadline_alerts')
        .update({
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-deadline-alerts'] });
    }
  });

  // Calculate budget stats
  const budgetStats = {
    totalBudget: contracts.reduce((sum, c) => sum + (c.total_budget || 0), 0),
    totalPaid: contracts.reduce((sum, c) => {
      const paid = (c as any).project_milestones?.filter((m: ProjectMilestone) => m.status === 'paid')
        .reduce((s: number, m: ProjectMilestone) => s + m.amount, 0) || 0;
      return sum + paid;
    }, 0),
    pendingPayments: contracts.reduce((sum, c) => {
      const pending = (c as any).project_milestones?.filter((m: ProjectMilestone) => m.status === 'approved')
        .reduce((s: number, m: ProjectMilestone) => s + m.amount, 0) || 0;
      return sum + pending;
    }, 0),
    activeContracts: contracts.filter(c => c.contract_status === 'active').length,
    pendingApprovals: changeOrders.filter(co => co.status === 'pending').length
  };

  return {
    contracts,
    invoices,
    changeOrders,
    alerts,
    budgetStats,
    isLoading: contractsLoading || invoicesLoading || changeOrdersLoading || alertsLoading,
    createInvoice,
    createChangeOrder,
    approveChangeOrder,
    rejectChangeOrder,
    acknowledgeAlert
  };
}
