import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EnhancedCompanyMember, OrgChartNode } from '@/types/organization';
import { toast } from 'sonner';

export function useOrgChart(companyId: string | null) {
  const [members, setMembers] = useState<EnhancedCompanyMember[]>([]);
  const [orgTree, setOrgTree] = useState<OrgChartNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      loadOrgChart();
    }
  }, [companyId]);

  const loadOrgChart = async () => {
    if (!companyId) return;

    try {
      setLoading(true);

      // Fetch all active members with their profiles and departments
      const { data: membersData, error } = await (supabase as any)
        .from('company_members')
        .select(`
          *,
          profiles!company_members_user_id_fkey (
            full_name,
            avatar_url,
            email
          ),
          company_departments!company_members_department_id_fkey (
            id,
            name,
            description,
            department_type,
            color_hex,
            icon_name
          )
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .neq('visibility_in_org_chart', 'hidden')
        .order('display_order_in_dept', { ascending: true });

      if (error) throw error;

      const enhancedMembers = (membersData || []).map((member: any) => ({
        ...member,
        department: member.company_departments,
      })) as EnhancedCompanyMember[];

      setMembers(enhancedMembers);

      // Build tree structure
      const tree = buildOrgTree(enhancedMembers);
      setOrgTree(tree);

    } catch (error: unknown) {
      console.error('Error loading org chart:', error);
      toast.error('Failed to load organization chart');
    } finally {
      setLoading(false);
    }
  };

  const buildOrgTree = (members: EnhancedCompanyMember[]): OrgChartNode[] => {
    const memberMap = new Map<string, EnhancedCompanyMember>();
    const rootNodes: OrgChartNode[] = [];
    const nodeMap = new Map<string, OrgChartNode>();

    // Create map of members
    members.forEach(member => {
      memberMap.set(member.id, member);
      nodeMap.set(member.id, {
        member,
        children: [],
        level: 0,
      });
    });

    // Build tree structure
    members.forEach(member => {
      const node = nodeMap.get(member.id)!;

      if (!member.reports_to_member_id) {
        // Root node (no manager)
        rootNodes.push(node);
      } else {
        // Has a manager - add as child
        const parentNode = nodeMap.get(member.reports_to_member_id);
        if (parentNode) {
          parentNode.children.push(node);
          node.level = parentNode.level + 1;
        } else {
          // Parent not found, treat as root
          rootNodes.push(node);
        }
      }
    });

    return rootNodes;
  };

  const updateMemberReporting = async (
    memberId: string,
    reportsToMemberId: string | null,
    departmentId: string | null = undefined
  ) => {
    try {
      const updates: any = {
        reports_to_member_id: reportsToMemberId,
      };

      if (departmentId !== undefined) {
        updates.department_id = departmentId;
      }

      const { error } = await supabase
        .from('company_members')
        .update(updates)
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Reporting structure updated');
      await loadOrgChart();
    } catch (error: unknown) {
      console.error('Error updating reporting:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update reporting structure');
    }
  };

  const updateMemberDetails = async (
    memberId: string,
    updates: Partial<EnhancedCompanyMember>
  ) => {
    try {
      const { error } = await supabase
        .from('company_members')
        .update(updates)
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Member details updated');
      await loadOrgChart();
    } catch (error: unknown) {
      console.error('Error updating member:', error);
      toast.error('Failed to update member details');
    }
  };

  return {
    members,
    orgTree,
    loading,
    refresh: loadOrgChart,
    updateMemberReporting,
    updateMemberDetails,
  };
}
