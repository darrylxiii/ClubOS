import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useOrgChart } from '@/hooks/useOrgChart';
import { useDepartments } from '@/hooks/useDepartments';
import { EnhancedCompanyMember } from '@/types/organization';
import { Loader2, User, MapPin, Calendar, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MemberAssignmentEditorProps {
  companyId: string;
}

export function MemberAssignmentEditor({ companyId }: MemberAssignmentEditorProps) {
  const { members, loading: membersLoading, updateMemberDetails, refresh } = useOrgChart(companyId);
  const { departments, loading: deptsLoading } = useDepartments(companyId);
  
  const [selectedMember, setSelectedMember] = useState<EnhancedCompanyMember | null>(null);
  const [editForm, setEditForm] = useState<{
    job_title: string;
    department_id: string;
    reports_to_member_id: string;
    employment_type: 'full_time' | 'part_time' | 'contractor' | 'consultant';
    location: string;
    start_date: string;
    visibility_in_org_chart: 'full' | 'name_only' | 'hidden';
    is_people_manager: boolean;
  }>({
    job_title: '',
    department_id: '',
    reports_to_member_id: '',
    employment_type: 'full_time',
    location: '',
    start_date: '',
    visibility_in_org_chart: 'full',
    is_people_manager: false,
  });

  useEffect(() => {
    if (selectedMember) {
      setEditForm({
        job_title: selectedMember.job_title || '',
        department_id: selectedMember.department_id || '',
        reports_to_member_id: selectedMember.reports_to_member_id || '',
        employment_type: selectedMember.employment_type || 'full_time',
        location: selectedMember.location || '',
        start_date: selectedMember.start_date || '',
        visibility_in_org_chart: selectedMember.visibility_in_org_chart || 'full',
        is_people_manager: selectedMember.is_people_manager || false,
      });
    }
  }, [selectedMember]);

  const handleSave = async () => {
    if (!selectedMember) return;

    await updateMemberDetails(selectedMember.id, editForm);
    setSelectedMember(null);
  };

  const availableManagers = members.filter(m => 
    m.id !== selectedMember?.id && 
    m.is_people_manager
  );

  if (membersLoading || deptsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Member Assignment</CardTitle>
        <CardDescription>Assign team members to departments and set reporting structure</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Members List */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm mb-4">Team Members</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {members.map((member) => (
                <div
                  key={member.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedMember?.id === member.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setSelectedMember(member)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {member.profiles?.full_name?.substring(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {member.profiles?.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.job_title || 'No title set'}
                      </p>
                      {member.department && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          {member.department.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Form */}
          <div className="space-y-4">
            {selectedMember ? (
              <>
                <div className="flex items-center gap-3 pb-4 border-b">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={selectedMember.profiles?.avatar_url || undefined} />
                    <AvatarFallback>
                      {selectedMember.profiles?.full_name?.substring(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedMember.profiles?.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedMember.profiles?.email}</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={editForm.job_title}
                    onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                    placeholder="e.g., Senior Software Engineer"
                  />
                </div>

                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={editForm.department_id}
                    onValueChange={(value) => setEditForm({ ...editForm, department_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No department</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="reports_to">Reports To</Label>
                  <Select
                    value={editForm.reports_to_member_id}
                    onValueChange={(value) => setEditForm({ ...editForm, reports_to_member_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No manager (CEO/Owner)</SelectItem>
                      {availableManagers.map((manager) => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.profiles?.full_name} - {manager.job_title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="employment_type">Employment Type</Label>
                  <Select
                    value={editForm.employment_type}
                    onValueChange={(value: any) => setEditForm({ ...editForm, employment_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="consultant">Consultant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder="e.g., Amsterdam, Remote"
                  />
                </div>

                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={editForm.start_date}
                    onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="visibility">Visibility in Org Chart</Label>
                  <Select
                    value={editForm.visibility_in_org_chart}
                    onValueChange={(value: any) => setEditForm({ ...editForm, visibility_in_org_chart: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full (Show all details)</SelectItem>
                      <SelectItem value="name_only">Name Only</SelectItem>
                      <SelectItem value="hidden">Hidden</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_people_manager"
                    checked={editForm.is_people_manager}
                    onChange={(e) => setEditForm({ ...editForm, is_people_manager: e.target.checked })}
                    className="rounded border-muted-foreground"
                  />
                  <Label htmlFor="is_people_manager" className="cursor-pointer">
                    People Manager (has direct reports)
                  </Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} className="flex-1">
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedMember(null)}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <User className="w-12 h-12 mb-4 opacity-50" />
                <p>Select a team member to edit their details</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
