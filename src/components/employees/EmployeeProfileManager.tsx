import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  Plus, 
  Search,
  Edit,
  Trash2,
  Eye
} from "lucide-react";
import { motion } from "framer-motion";
import { useAllEmployees, EmployeeProfile } from "@/hooks/useEmployeeProfile";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserSelectCombobox } from "./UserSelectCombobox";
import { EmployeeDetailView } from "./EmployeeDetailView";
import { AvailableUser } from "@/hooks/useAvailableUsers";
import { useUserCompany } from "@/hooks/useUserCompany";
import { CommissionTierSelector, TierConfig } from "./CommissionTierSelector";

export function EmployeeProfileManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeProfile | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<EmployeeProfile | null>(null);
  const queryClient = useQueryClient();
  const { data: userCompany, isLoading: isLoadingCompany } = useUserCompany();

  const { data: employees, isLoading } = useAllEmployees();

  // Compute effective companyId: undefined = wait, null = all users (admin fallback)
  const effectiveCompanyId = isLoadingCompany 
    ? undefined  // Still loading - wait
    : (userCompany?.id ?? null);  // Loaded - use ID or null for all users

  const filteredEmployees = employees?.filter(emp => {
    const profileData = emp.profile as { full_name?: string } | undefined;
    const name = profileData?.full_name?.toLowerCase() || '';
    const title = emp.job_title?.toLowerCase() || '';
    const dept = emp.department?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || title.includes(query) || dept.includes(query);
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('employee_profiles')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-employees'] });
      toast.success("Employee deactivated");
    },
    onError: () => {
      toast.error("Failed to deactivate employee");
    },
  });

  const handleEdit = (employee: EmployeeProfile) => {
    setEditingEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingEmployee(null);
    setIsDialogOpen(true);
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Employee Management
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" onClick={handleCreate}>
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? 'Edit Employee Profile' : 'Add New Employee'}
              </DialogTitle>
            </DialogHeader>
            <EmployeeForm 
              employee={editingEmployee} 
              onClose={() => setIsDialogOpen(false)}
              allEmployees={employees || []}
              companyId={effectiveCompanyId}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Employee List */}
        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-muted/50 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredEmployees?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Users className="h-8 w-8 mb-2 opacity-50" />
              <p>No employees found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEmployees?.map((employee, index) => {
                const profileData = employee.profile as { full_name?: string; avatar_url?: string | null } | undefined;
                return (
                  <motion.div
                    key={employee.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profileData?.avatar_url || undefined} />
                        <AvatarFallback>
                          {profileData?.full_name?.charAt(0) || 'E'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{profileData?.full_name || 'Employee'}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{employee.job_title}</span>
                          {employee.department && (
                            <>
                              <span>•</span>
                              <span>{employee.department}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right hidden md:block">
                        <Badge variant="outline" className="mb-1">
                          {employee.commission_structure === 'fixed' 
                            ? 'Fixed' 
                            : `${employee.commission_percentage}% ${employee.commission_structure}`}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {employee.employment_type.replace('_', ' ')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingEmployee(employee)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(employee)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteEmployee.mutate(employee.id)}
                        title="Deactivate"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* View Employee Detail Dialog */}
        <Dialog open={!!viewingEmployee} onOpenChange={(open) => !open && setViewingEmployee(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Employee Details</DialogTitle>
            </DialogHeader>
            {viewingEmployee && (
              <EmployeeDetailView 
                employee={viewingEmployee} 
                onClose={() => setViewingEmployee(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function EmployeeForm({ 
  employee, 
  onClose,
  allEmployees,
  companyId
}: { 
  employee: EmployeeProfile | null;
  onClose: () => void;
  allEmployees: EmployeeProfile[];
  companyId?: string | null;
}) {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<AvailableUser | null>(null);
  const [formData, setFormData] = useState({
    user_id: employee?.user_id || '',
    job_title: employee?.job_title || '',
    department: employee?.department || '',
    employment_type: employee?.employment_type || 'full_time',
    commission_structure: employee?.commission_structure || 'percentage',
    commission_percentage: employee?.commission_percentage || 5,
    manager_id: employee?.manager_id || '',
    base_salary: employee?.base_salary || 0,
    annual_bonus_target: employee?.annual_bonus_target || 0,
  });
  
  // Commission tier state
  const [customTiers, setCustomTiers] = useState<TierConfig[]>([
    { min_revenue: 0, max_revenue: 50000, commission_rate: 5 },
    { min_revenue: 50000, max_revenue: 100000, commission_rate: 7.5 },
    { min_revenue: 100000, max_revenue: null, commission_rate: 10 },
  ]);
  const [useCompanyDefaults, setUseCompanyDefaults] = useState(true);
  const [fixedAmount, setFixedAmount] = useState(0);

  const handleUserSelect = (user: AvailableUser | null) => {
    setSelectedUser(user);
    if (user) {
      setFormData(prev => ({
        ...prev,
        user_id: user.id,
        job_title: prev.job_title || user.current_title || '',
      }));
    }
  };

  const saveEmployee = useMutation({
    mutationFn: async () => {
      if (employee) {
        const { error } = await supabase
          .from('employee_profiles')
          .update({
            job_title: formData.job_title,
            department: formData.department,
            employment_type: formData.employment_type,
            commission_structure: formData.commission_structure,
            commission_percentage: formData.commission_percentage,
            manager_id: formData.manager_id || null,
            base_salary: formData.base_salary,
            annual_bonus_target: formData.annual_bonus_target,
            updated_at: new Date().toISOString(),
          })
          .eq('id', employee.id);
        if (error) throw error;
      } else {
        if (!formData.user_id) throw new Error('Please select a user');
        if (!formData.job_title.trim()) throw new Error('Please enter a job title');
        
        const { error } = await supabase
          .from('employee_profiles')
          .insert({
            user_id: formData.user_id,
            job_title: formData.job_title,
            department: formData.department,
            employment_type: formData.employment_type,
            commission_structure: formData.commission_structure,
            commission_percentage: formData.commission_percentage,
            manager_id: formData.manager_id || null,
            base_salary: formData.base_salary,
            annual_bonus_target: formData.annual_bonus_target,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-employees'] });
      queryClient.invalidateQueries({ queryKey: ['available-users'] });
      toast.success(employee ? "Employee updated" : "Employee created");
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to save employee: ${(error as Error).message}`);
    },
  });

  return (
    <div className="space-y-4">
      {/* User Selection - only for new employees */}
      {!employee && (
        <div className="space-y-2">
          <Label>Select User *</Label>
          <UserSelectCombobox
            value={selectedUser}
            onChange={handleUserSelect}
            placeholder="Search for a user..."
            companyId={companyId}
          />
          {selectedUser && (
            <p className="text-xs text-muted-foreground">
              Role: {selectedUser.role || 'No role assigned'}
            </p>
          )}
          {!companyId && (
            <p className="text-xs text-amber-500">
              Warning: No company context. Showing all users.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Job Title *</Label>
          <Input
            value={formData.job_title}
            onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
            placeholder="e.g., Senior Recruiter"
          />
        </div>
        <div className="space-y-2">
          <Label>Department</Label>
          <Input
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            placeholder="e.g., Recruitment"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Employment Type</Label>
          <Select
            value={formData.employment_type}
            onValueChange={(value) => setFormData({ ...formData, employment_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full_time">Full Time</SelectItem>
              <SelectItem value="part_time">Part Time</SelectItem>
              <SelectItem value="contractor">Contractor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Manager</Label>
          <Select
            value={formData.manager_id || "__none__"}
            onValueChange={(value) => setFormData({ ...formData, manager_id: value === "__none__" ? "" : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select manager" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No Manager</SelectItem>
              {allEmployees
                .filter(e => e.id !== employee?.id)
                .map(e => {
                  const profileData = e.profile as { full_name?: string } | undefined;
                  return (
                    <SelectItem key={e.id} value={e.id}>
                      {profileData?.full_name || 'Employee'} ({e.job_title})
                    </SelectItem>
                  );
                })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Commission Structure Type Selection */}
      <div className="space-y-2">
        <Label>Commission Structure</Label>
        <Select
          value={formData.commission_structure}
          onValueChange={(value) => setFormData({ ...formData, commission_structure: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="percentage">Percentage</SelectItem>
            <SelectItem value="tiered">Tiered</SelectItem>
            <SelectItem value="hybrid">Hybrid (Base + Tiers)</SelectItem>
            <SelectItem value="fixed">Fixed Amount</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dynamic Commission Configuration */}
      <CommissionTierSelector
        commissionStructure={formData.commission_structure}
        basePercentage={formData.commission_percentage}
        onBasePercentageChange={(value) => setFormData({ ...formData, commission_percentage: value })}
        customTiers={customTiers}
        onCustomTiersChange={setCustomTiers}
        useCompanyDefaults={useCompanyDefaults}
        onUseCompanyDefaultsChange={setUseCompanyDefaults}
        fixedAmount={fixedAmount}
        onFixedAmountChange={setFixedAmount}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Base Salary (€)</Label>
          <Input
            type="number"
            min="0"
            value={formData.base_salary}
            onChange={(e) => setFormData({ ...formData, base_salary: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label>Annual Bonus Target (€)</Label>
          <Input
            type="number"
            min="0"
            value={formData.annual_bonus_target}
            onChange={(e) => setFormData({ ...formData, annual_bonus_target: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button 
          onClick={() => saveEmployee.mutate()}
          disabled={(!employee && !formData.user_id) || !formData.job_title.trim() || saveEmployee.isPending}
        >
          {saveEmployee.isPending ? 'Saving...' : (employee ? 'Update' : 'Create')}
        </Button>
      </div>
    </div>
  );
}
