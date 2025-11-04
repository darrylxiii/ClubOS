import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useDepartments } from '@/hooks/useDepartments';
import { Department } from '@/types/organization';
import { Plus, Edit2, Archive, Loader2, Sparkles } from 'lucide-react';
import * as Icons from 'lucide-react';

interface DepartmentManagerProps {
  companyId: string;
}

const ICON_OPTIONS = [
  'Users', 'Code', 'TrendingUp', 'Megaphone', 'Heart', 
  'DollarSign', 'Scale', 'Target', 'Crown', 'Shield',
  'Briefcase', 'Lightbulb', 'Zap', 'Award', 'Globe'
];

const DEPARTMENT_TYPES = [
  { value: 'leadership', label: 'Leadership', color: 'bg-accent' },
  { value: 'core', label: 'Core Business', color: 'bg-primary' },
  { value: 'support', label: 'Support Function', color: 'bg-muted' },
];

export function DepartmentManager({ companyId }: DepartmentManagerProps) {
  const { departments, loading, createDepartment, updateDepartment, deleteDepartment, seedStandardDepartments } = useDepartments(companyId);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    department_type: 'core' | 'support' | 'leadership';
    color_hex: string;
    icon_name: string;
  }>({
    name: '',
    description: '',
    department_type: 'core',
    color_hex: '#C9A24E',
    icon_name: 'Users',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingDept) {
      await updateDepartment(editingDept.id, formData);
    } else {
      await createDepartment(formData.name, formData.department_type, {
        description: formData.description,
        colorHex: formData.color_hex,
        iconName: formData.icon_name,
      });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      department_type: 'core',
      color_hex: '#C9A24E',
      icon_name: 'Users',
    });
    setEditingDept(null);
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      description: dept.description || '',
      department_type: dept.department_type,
      color_hex: dept.color_hex,
      icon_name: dept.icon_name,
    });
    setIsDialogOpen(true);
  };

  const handleSeedStandard = async () => {
    await seedStandardDepartments();
  };

  const IconComponent = (Icons as any)[formData.icon_name] || Icons.Users;

  if (loading) {
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Department Management</CardTitle>
            <CardDescription>Create and manage organizational departments</CardDescription>
          </div>
          <div className="flex gap-2">
            {departments.length === 0 && (
              <Button onClick={handleSeedStandard} variant="outline" size="sm">
                <Sparkles className="w-4 h-4 mr-2" />
                Quick Setup
              </Button>
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={resetForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Department
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingDept ? 'Edit Department' : 'Create Department'}</DialogTitle>
                  <DialogDescription>
                    Define a department to organize your team structure
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Department Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Engineering, Sales, Marketing"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of this department's role"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="type">Department Type</Label>
                    <Select
                      value={formData.department_type}
                      onValueChange={(value: any) => setFormData({ ...formData, department_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="icon">Icon</Label>
                    <Select
                      value={formData.icon_name}
                      onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map(icon => {
                          const Icon = (Icons as any)[icon];
                          return (
                            <SelectItem key={icon} value={icon}>
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4" />
                                {icon}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="color">Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="color"
                        type="color"
                        value={formData.color_hex}
                        onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                        className="w-20 h-10"
                      />
                      <Input
                        value={formData.color_hex}
                        onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                        placeholder="#C9A24E"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      {editingDept ? 'Update' : 'Create'} Department
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {departments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No departments yet. Create your first department to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {departments.map((dept) => {
              const DeptIcon = (Icons as any)[dept.icon_name] || Icons.Users;
              const typeInfo = DEPARTMENT_TYPES.find(t => t.value === dept.department_type);
              
              return (
                <Card key={dept.id} className="relative overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 w-1 h-full" 
                    style={{ backgroundColor: dept.color_hex }}
                  />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${dept.color_hex}20` }}
                        >
                          <DeptIcon className="w-4 h-4" style={{ color: dept.color_hex }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{dept.name}</h4>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleEdit(dept)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => deleteDepartment(dept.id)}
                        >
                          <Archive className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary" className="text-xs">
                      {typeInfo?.label}
                    </Badge>
                    {dept.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {dept.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
