import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useJobTeamRole(jobId: string) {
  const { user } = useAuth();
  const [jobRole, setJobRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchJobRole() {
      if (!user || !jobId) {
        setLoading(false);
        return;
      }
      
      try {
        // First get user's profile to find company
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', user.id)
          .single();
        
        if (!profile?.company_id) {
          setLoading(false);
          return;
        }
        
        // Get company member record
        const { data: member } = await supabase
          .from('company_members')
          .select('id')
          .eq('user_id', user.id)
          .eq('company_id', profile.company_id)
          .single();
        
        if (!member) {
          setLoading(false);
          return;
        }
        
        // Get job team assignment
        const { data: assignment } = await supabase
          .from('job_team_assignments')
          .select('*')
          .eq('job_id', jobId)
          .eq('company_member_id', member.id)
          .single();
        
        if (assignment) {
          setJobRole(assignment.job_role);
          setPermissions({
            canViewCandidates: assignment.can_view_candidates,
            canScheduleInterviews: assignment.can_schedule_interviews,
            canAdvanceCandidates: assignment.can_advance_candidates,
            canDeclineCandidates: assignment.can_decline_candidates,
            canMakeOffers: assignment.can_make_offers,
            isPrimaryContact: assignment.is_primary_contact,
          });
        }
      } catch (error) {
        console.error('Error fetching job role:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchJobRole();
  }, [user, jobId]);
  
  return { jobRole, permissions, loading };
}
