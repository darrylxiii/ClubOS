import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AddJobTeamMemberDialogProps {
  jobId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

export const AddJobTeamMemberDialog = ({
  jobId,
  open,
  onOpenChange,
  onAdded,
}: AddJobTeamMemberDialogProps) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'company' | 'external'>('company');
  const [companyMembers, setCompanyMembers] = useState<any[]>([]);
  const [tqcTeamMembers, setTqcTeamMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedExternalUserId, setSelectedExternalUserId] = useState('');
  const [assignmentReason, setAssignmentReason] = useState('');
  const [jobRole, setJobRole] = useState('technical_interviewer');
  const [permissions, setPermissions] = useState({
    can_view_candidates: true,
    can_schedule_interviews: false,
    can_advance_candidates: false,
    can_decline_candidates: false,
    can_make_offers: false,
  });
  const [isPrimaryContact, setIsPrimaryContact] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCompanyMembers();
      fetchTqcTeamMembers();
    }
  }, [open, jobId]);

  const fetchCompanyMembers = async () => {
    try {
      // Get company_id from job
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('company_id')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;

      // Get company members not already assigned to this job
      const { data: members, error: membersError } = await supabase
        .from('company_members')
        .select('id, job_title, user_id')
        .eq('company_id', job.company_id)
        .eq('is_active', true);

      if (membersError) throw membersError;

      // Get user profiles for these members
      const userIds = members?.map(m => m.user_id).filter(Boolean) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Filter out already assigned members
      const { data: assigned } = await supabase
        .from('job_team_assignments')
        .select('company_member_id, external_user_id')
        .eq('job_id', jobId);

      const assignedIds = new Set(assigned?.map((a) => a.company_member_id).filter(Boolean) || []);
      
      // Combine member data with profiles
      const membersWithProfiles = members?.map(member => ({
        ...member,
        user: profiles?.find(p => p.id === member.user_id)
      })).filter((m) => !assignedIds.has(m.id)) || [];

      setCompanyMembers(membersWithProfiles);
    } catch (error) {
      console.error('Error fetching company members:', error);
      toast.error('Failed to load team members');
    }
  };

  const fetchTqcTeamMembers = async () => {
    try {
      // Get TQC team members (admins and strategists)
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'strategist']);

      if (rolesError) throw rolesError;

      const tqcUserIds = userRoles?.map(r => r.user_id) || [];
      
      if (tqcUserIds.length === 0) {
        setTqcTeamMembers([]);
        return;
      }

      const { data: tqcMembers, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', tqcUserIds);

      if (error) throw error;

      // Add roles to profiles
      const membersWithRoles = tqcMembers?.map(member => ({
        ...member,
        roles: userRoles?.filter(r => r.user_id === member.id).map(r => r.role) || []
      })) || [];

      // Filter out already assigned external users
      const { data: assigned } = await supabase
        .from('job_team_assignments')
        .select('external_user_id')
        .eq('job_id', jobId);

      const assignedExternalIds = new Set(assigned?.map((a) => a.external_user_id).filter(Boolean) || []);
      const available = membersWithRoles.filter((m) => !assignedExternalIds.has(m.id));

      setTqcTeamMembers(available);
    } catch (error) {
      console.error('Error fetching TQC team members:', error);
      toast.error('Failed to load TQC team members');
    }
  };

  const handleRoleChange = (role: string) => {
    setJobRole(role);

    // Set default permissions based on role
    switch (role) {
      case 'hiring_manager':
        setPermissions({
          can_view_candidates: true,
          can_schedule_interviews: true,
          can_advance_candidates: true,
          can_decline_candidates: true,
          can_make_offers: true,
        });
        break;
      case 'founder_reviewer':
        setPermissions({
          can_view_candidates: true,
          can_schedule_interviews: false,
          can_advance_candidates: true,
          can_decline_candidates: true,
          can_make_offers: true,
        });
        break;
      case 'technical_interviewer':
      case 'behavioral_interviewer':
      case 'panel_member':
        setPermissions({
          can_view_candidates: true,
          can_schedule_interviews: false,
          can_advance_candidates: false,
          can_decline_candidates: false,
          can_make_offers: false,
        });
        break;
      case 'observer':
        setPermissions({
          can_view_candidates: true,
          can_schedule_interviews: false,
          can_advance_candidates: false,
          can_decline_candidates: false,
          can_make_offers: false,
        });
        break;
      case 'coordinator':
        setPermissions({
          can_view_candidates: true,
          can_schedule_interviews: true,
          can_advance_candidates: false,
          can_decline_candidates: false,
          can_make_offers: false,
        });
        break;
    }
  };

  const handleSubmit = async () => {
    if (mode === 'company' && !selectedMemberId) {
      toast.error('Please select a team member');
      return;
    }

    if (mode === 'external') {
      if (!selectedExternalUserId) {
        toast.error('Please select a user');
        return;
      }
      if (!assignmentReason.trim()) {
        toast.error('Please provide a reason for this assignment');
        return;
      }
    }

    setSubmitting(true);
    try {
      const insertData: any = {
        job_id: jobId,
        job_role: jobRole,
        ...permissions,
        is_primary_contact: isPrimaryContact,
        assigned_by: user?.id,
      };

      if (mode === 'company') {
        insertData.company_member_id = selectedMemberId;
        insertData.assignment_type = 'company_member';
      } else {
        insertData.external_user_id = selectedExternalUserId;
        insertData.assignment_type = 'tqc_team';
        insertData.assignment_reason = assignmentReason;
      }

      const { error } = await supabase.from('job_team_assignments').insert(insertData);

      if (error) throw error;

      toast.success('Team member added successfully');
      onAdded();
      onOpenChange(false);
      
      // Reset form
      setSelectedMemberId('');
      setSelectedExternalUserId('');
      setAssignmentReason('');
      setJobRole('technical_interviewer');
      setIsPrimaryContact(false);
      setMode('company');
    } catch (error: any) {
      console.error('Error adding team member:', error);
      toast.error(error.message || 'Failed to add team member');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTqcMembers = tqcTeamMembers.filter(
    (member) =>
      member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Assign a team member or external user to this job with specific role and permissions.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'company' | 'external')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="company">
              Company Team ({companyMembers.length})
            </TabsTrigger>
            <TabsTrigger value="external">
              External Users
              <Badge variant="outline" className="ml-2">TQC + Others</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Team Member</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {companyMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{member.user?.full_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {member.job_title || member.user?.email}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={jobRole} onValueChange={handleRoleChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hiring_manager">Hiring Manager</SelectItem>
                <SelectItem value="founder_reviewer">Founder/Executive Reviewer</SelectItem>
                <SelectItem value="technical_interviewer">Technical Interviewer</SelectItem>
                <SelectItem value="behavioral_interviewer">Behavioral Interviewer</SelectItem>
                <SelectItem value="panel_member">Panel Member</SelectItem>
                <SelectItem value="coordinator">Interview Coordinator</SelectItem>
                <SelectItem value="observer">Observer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Permissions</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="view"
                  checked={permissions.can_view_candidates}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_view_candidates: !!checked })
                  }
                />
                <label htmlFor="view" className="text-sm cursor-pointer">
                  View candidates
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="schedule"
                  checked={permissions.can_schedule_interviews}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_schedule_interviews: !!checked })
                  }
                />
                <label htmlFor="schedule" className="text-sm cursor-pointer">
                  Schedule interviews
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="advance"
                  checked={permissions.can_advance_candidates}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_advance_candidates: !!checked })
                  }
                />
                <label htmlFor="advance" className="text-sm cursor-pointer">
                  Advance candidates
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="decline"
                  checked={permissions.can_decline_candidates}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_decline_candidates: !!checked })
                  }
                />
                <label htmlFor="decline" className="text-sm cursor-pointer">
                  Decline candidates
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="offers"
                  checked={permissions.can_make_offers}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_make_offers: !!checked })
                  }
                />
                <label htmlFor="offers" className="text-sm cursor-pointer">
                  Make offers
                </label>
              </div>
            </div>
          </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="primary"
                checked={isPrimaryContact}
                onCheckedChange={(checked) => setIsPrimaryContact(!!checked)}
              />
              <label htmlFor="primary" className="text-sm cursor-pointer">
                Set as primary contact
              </label>
            </div>
          </TabsContent>

          <TabsContent value="external" className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">External user assignment coming soon...</p>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Member'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
