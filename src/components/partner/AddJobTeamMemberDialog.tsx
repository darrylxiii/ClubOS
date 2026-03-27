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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Shield, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('partner');
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
        .maybeSingle();

      if (jobError) throw jobError;
      if (!job) return;

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
      toast.error(t('addJobTeamMemberDialog.toast.failedToLoadTeamMembers'));
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
      toast.error(t('addJobTeamMemberDialog.toast.failedToLoadTqcTeamMembers'));
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
      toast.error(t('addJobTeamMemberDialog.toast.pleaseSelectATeamMember'));
      return;
    }

    if (mode === 'external') {
      if (!selectedExternalUserId) {
        toast.error(t('addJobTeamMemberDialog.toast.pleaseSelectAUser'));
        return;
      }
      if (!assignmentReason.trim()) {
        toast.error(t('addJobTeamMemberDialog.toast.pleaseProvideAReasonForThisAssignment'));
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

      toast.success(t('addJobTeamMemberDialog.toast.teamMemberAddedSuccessfully'));
      onAdded();
      onOpenChange(false);
      
      // Reset form
      setSelectedMemberId('');
      setSelectedExternalUserId('');
      setAssignmentReason('');
      setJobRole('technical_interviewer');
      setIsPrimaryContact(false);
      setMode('company');
    } catch (error: unknown) {
      console.error('Error adding team member:', error);
      toast.error(error instanceof Error ? error.message : t('partner.addjobteammemberdialog.failedToAddTeamMember', 'Failed to add team member'));
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
          <DialogTitle>{t('addJobTeamMemberDialog.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('addJobTeamMemberDialog.dialogDescription')}</DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'company' | 'external')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="company">
              Company Team ({companyMembers.length})
            </TabsTrigger>
            <TabsTrigger value="external">
              {t('partner.addjobteammemberdialog.externalUsers', 'External Users')}
              <Badge variant="outline" className="ml-2">{t('partner.addjobteammemberdialog.tqcOthers', 'TQC + Others')}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('addJobTeamMemberDialog.label.teamMember')}</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('addJobTeamMemberDialog.placeholder.selectATeamMember')} />
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
            <Label>{t('addJobTeamMemberDialog.label.role')}</Label>
            <Select value={jobRole} onValueChange={handleRoleChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hiring_manager">{t('addJobTeamMemberDialog.option.hiringManager')}</SelectItem>
                <SelectItem value="founder_reviewer">{t('addJobTeamMemberDialog.option.founderexecutiveReviewer')}</SelectItem>
                <SelectItem value="technical_interviewer">{t('addJobTeamMemberDialog.option.technicalInterviewer')}</SelectItem>
                <SelectItem value="behavioral_interviewer">{t('addJobTeamMemberDialog.option.behavioralInterviewer')}</SelectItem>
                <SelectItem value="panel_member">{t('addJobTeamMemberDialog.option.panelMember')}</SelectItem>
                <SelectItem value="coordinator">{t('addJobTeamMemberDialog.option.interviewCoordinator')}</SelectItem>
                <SelectItem value="observer">{t('addJobTeamMemberDialog.option.observer')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>{t('addJobTeamMemberDialog.label.permissions')}</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="view"
                  checked={permissions.can_view_candidates}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_view_candidates: !!checked })
                  }
                />
                <label htmlFor="view" className="text-sm cursor-pointer">{t('partner.addjobteammemberdialog.viewCandidates', 'View candidates')}</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="schedule"
                  checked={permissions.can_schedule_interviews}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_schedule_interviews: !!checked })
                  }
                />
                <label htmlFor="schedule" className="text-sm cursor-pointer">{t('partner.addjobteammemberdialog.scheduleInterviews', 'Schedule interviews')}</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="advance"
                  checked={permissions.can_advance_candidates}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_advance_candidates: !!checked })
                  }
                />
                <label htmlFor="advance" className="text-sm cursor-pointer">{t('partner.addjobteammemberdialog.advanceCandidates', 'Advance candidates')}</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="decline"
                  checked={permissions.can_decline_candidates}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_decline_candidates: !!checked })
                  }
                />
                <label htmlFor="decline" className="text-sm cursor-pointer">{t('partner.addjobteammemberdialog.declineCandidates', 'Decline candidates')}</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="offers"
                  checked={permissions.can_make_offers}
                  onCheckedChange={(checked) =>
                    setPermissions({ ...permissions, can_make_offers: !!checked })
                  }
                />
                <label htmlFor="offers" className="text-sm cursor-pointer">{t('partner.addjobteammemberdialog.makeOffers', 'Make offers')}</label>
              </div>
            </div>
          </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="primary"
                checked={isPrimaryContact}
                onCheckedChange={(checked) => setIsPrimaryContact(!!checked)}
              />
              <label htmlFor="primary" className="text-sm cursor-pointer">{t('partner.addjobteammemberdialog.setAsPrimaryContact', 'Set as primary contact')}</label>
            </div>
          </TabsContent>

          <TabsContent value="external" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('addJobTeamMemberDialog.placeholder.searchTqcTeamByNameOrEmail')}
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('addJobTeamMemberDialog.label.selectTqcTeamMember')}</Label>
                <RadioGroup value={selectedExternalUserId} onValueChange={setSelectedExternalUserId}>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {filteredTqcMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <RadioGroupItem value={member.id} id={`tqc-${member.id}`} />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback>
                            {member.full_name?.charAt(0) || member.email?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <label htmlFor={`tqc-${member.id}`} className="flex-1 cursor-pointer">
                          <div className="font-medium">{member.full_name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">{member.email}</div>
                        </label>
                        <div className="flex gap-1">
                          {member.roles?.includes('admin') && (
                            <Badge variant="outline" className="text-xs">{t('addJobTeamMemberDialog.badge.admin')}</Badge>
                          )}
                          {member.roles?.includes('strategist') && (
                            <Badge variant="secondary" className="text-xs">{t('addJobTeamMemberDialog.badge.strategist')}</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredTqcMembers.length === 0 && (
                      <p className="text-center py-4 text-muted-foreground text-sm">{t('addJobTeamMemberDialog.noMatchingTeamMembersFound')}</p>
                    )}
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">{t('addJobTeamMemberDialog.label.assignmentReason')}</Label>
                <Textarea
                  id="reason"
                  placeholder={t('addJobTeamMemberDialog.placeholder.whyIsThisPersonBeingAssignedToThisJob')}
                  value={assignmentReason}
                  onChange={(e) => setAssignmentReason(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('addJobTeamMemberDialog.label.role')}</Label>
                <Select value={jobRole} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hiring_manager">{t('addJobTeamMemberDialog.option.hiringManager')}</SelectItem>
                    <SelectItem value="technical_interviewer">{t('addJobTeamMemberDialog.option.technicalInterviewer')}</SelectItem>
                    <SelectItem value="behavioral_interviewer">{t('addJobTeamMemberDialog.option.behavioralInterviewer')}</SelectItem>
                    <SelectItem value="panel_member">{t('addJobTeamMemberDialog.option.panelMember')}</SelectItem>
                    <SelectItem value="coordinator">{t('addJobTeamMemberDialog.option.interviewCoordinator')}</SelectItem>
                    <SelectItem value="observer">{t('addJobTeamMemberDialog.option.observer')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('addJobTeamMemberDialog.externalUsersReceiveLimitedTimeboxedAcce')}</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('partner.addjobteammemberdialog.adding', 'Adding...') : t('partner.addjobteammemberdialog.addMember', 'Add Member')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
