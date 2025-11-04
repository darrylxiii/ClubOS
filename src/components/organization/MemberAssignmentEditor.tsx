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
import { Loader2, Users } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface MemberAssignmentEditorProps {
  companyId: string;
}

export function MemberAssignmentEditor({ companyId }: MemberAssignmentEditorProps) {
  const { members, loading: membersLoading, updateMemberDetails, refresh } = useOrgChart(companyId);
  const { departments, loading: deptsLoading } = useDepartments(companyId);
  
  const [selectedMember, setSelectedMember] = useState<EnhancedCompanyMember | null>(null);

  // Calculate progress metrics
  const assignedCount = members.filter(m => m.department_id).length;
  const withTitles = members.filter(m => m.job_title).length;
  const withManagers = members.filter(m => m.reports_to_member_id).length;
  const totalMembers = members.length;
  
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

  const loading = membersLoading || deptsLoading;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Team Member Assignment</CardTitle>
            <CardDescription>
              Assign team members to departments and define reporting structure
            </CardDescription>
          </div>
          {totalMembers > 0 && (
            <div className="flex flex-col gap-2">
              <Badge variant={assignedCount === totalMembers ? "default" : "secondary"}>
                {assignedCount}/{totalMembers} assigned
              </Badge>
              <Badge variant={withTitles === totalMembers ? "default" : "outline"}>
                {withTitles}/{totalMembers} with titles
              </Badge>
              <Badge variant={withManagers > 0 ? "default" : "outline"}>
                {withManagers}/{totalMembers} reporting
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Team Members</h3>
            <p className="text-sm text-muted-foreground">
              Add team members to your company to start building your org chart
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Member List */}
            <div className="lg:col-span-1 space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                Team Members ({totalMembers})
              </h3>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2 pr-4">
                  {members.map((member) => {
                    const profile = member.profiles;
                    const isComplete = !!(member.department_id && member.job_title);

                    return (
                      <Card
                        key={member.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedMember?.id === member.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedMember(member)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={profile?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {profile?.full_name?.split(' ').map(n => n[0]).join('') || '??'}
                                </AvatarFallback>
                              </Avatar>
                              {isComplete && (
                                <div className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full border-2 border-background" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{profile?.full_name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {member.job_title || 'No title set'}
                              </p>
                              {!member.department_id && (
                                <Badge variant="outline" className="mt-1 text-xs">Unassigned</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Edit Form */}
            <div className="lg:col-span-2">
              {selectedMember ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>Edit Member Details</CardTitle>
                        <CardDescription>
                          Update job title, department, and reporting structure
                        </CardDescription>
                      </div>
                      {!selectedMember.department_id && (
                        <Badge variant="outline">⚠️ Incomplete</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Select a Member</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose a team member from the list to edit their details
                    </p>
                    {assignedCount === 0 && totalMembers > 0 && (
                      <div className="mt-4 p-4 bg-muted/50 rounded-lg max-w-md mx-auto">
                        <p className="text-sm font-medium mb-2">💡 Quick Start Guide</p>
                        <ol className="text-sm text-muted-foreground text-left space-y-1">
                          <li>1. Click on a team member</li>
                          <li>2. Set their job title</li>
                          <li>3. Assign them to a department</li>
                          <li>4. Define who they report to (if applicable)</li>
                          <li>5. Save changes</li>
                        </ol>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
