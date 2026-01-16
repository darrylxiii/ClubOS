import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, GraduationCap, Edit, Trash2, Calendar, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Education {
  id: string;
  institution_name: string;
  degree_type: string | null;
  field_of_study: string | null;
  grade: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean | null;
  description: string | null;
  certificate_url: string | null;
  certificate_verified: boolean | null;
  visibility: string | null;
}

interface EducationSectionProps {
  userId?: string;
  isReadOnly?: boolean;
}

export const EducationSection = ({ userId, isReadOnly = false }: EducationSectionProps = {}) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const [educations, setEducations] = useState<Education[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    institution_name: '',
    degree_type: 'bachelor',
    field_of_study: '',
    grade: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: '',
    certificate_url: '',
    visibility: 'public'
  });

  useEffect(() => {
    loadEducations();
  }, [targetUserId]);

  const loadEducations = async () => {
    if (!targetUserId) return;
    const { data, error } = await supabase
      .from('profile_education')
      .select('*')
      .eq('user_id', targetUserId)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error loading educations:', error);
      return;
    }
    setEducations(data || []);
  };

  const handleSave = async () => {
    if (!user || !targetUserId) return;

    const payload = {
      user_id: targetUserId,
      ...formData,
      end_date: formData.is_current ? null : formData.end_date
    };

    if (editingId) {
      const { error } = await supabase
        .from('profile_education')
        .update(payload)
        .eq('id', editingId);
      
      if (error) {
        toast.error('Failed to update education');
        return;
      }
      toast.success('Education updated');
    } else {
      const { error } = await supabase
        .from('profile_education')
        .insert(payload);
      
      if (error) {
        toast.error('Failed to add education');
        return;
      }
      toast.success('Education added');
    }

    setIsDialogOpen(false);
    resetForm();
    loadEducations();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('profile_education')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete education');
      return;
    }
    toast.success('Education deleted');
    loadEducations();
  };

  const handleEdit = (edu: Education) => {
    setEditingId(edu.id);
    setFormData({
      institution_name: edu.institution_name,
      degree_type: edu.degree_type || 'bachelor',
      field_of_study: edu.field_of_study || '',
      grade: edu.grade || '',
      start_date: edu.start_date || '',
      end_date: edu.end_date || '',
      is_current: edu.is_current || false,
      description: edu.description || '',
      certificate_url: edu.certificate_url || '',
      visibility: edu.visibility || 'public'
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      institution_name: '',
      degree_type: 'bachelor',
      field_of_study: '',
      grade: '',
      start_date: '',
      end_date: '',
      is_current: false,
      description: '',
      certificate_url: '',
      visibility: 'public'
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            <CardTitle>Education</CardTitle>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            {!isReadOnly && (
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Education
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit' : 'Add'} Education</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Institution Name *</Label>
                  <Input 
                    value={formData.institution_name}
                    onChange={(e) => setFormData({...formData, institution_name: e.target.value})}
                    placeholder="University of Amsterdam"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Degree Type</Label>
                    <Select value={formData.degree_type} onValueChange={(value) => setFormData({...formData, degree_type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
                        <SelectItem value="master">Master's Degree</SelectItem>
                        <SelectItem value="phd">Ph.D.</SelectItem>
                        <SelectItem value="certificate">Certificate</SelectItem>
                        <SelectItem value="bootcamp">Bootcamp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Field of Study</Label>
                    <Input 
                      value={formData.field_of_study}
                      onChange={(e) => setFormData({...formData, field_of_study: e.target.value})}
                      placeholder="Computer Science"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Grade / GPA</Label>
                  <Input 
                    value={formData.grade}
                    onChange={(e) => setFormData({...formData, grade: e.target.value})}
                    placeholder="3.8 / 4.0"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input 
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    />
                  </div>
                  {!formData.is_current && (
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input 
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    checked={formData.is_current}
                    onCheckedChange={(checked) => setFormData({...formData, is_current: checked})}
                  />
                  <Label>Currently studying here</Label>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Activities, awards, and other details..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Certificate URL</Label>
                  <Input 
                    value={formData.certificate_url}
                    onChange={(e) => setFormData({...formData, certificate_url: e.target.value})}
                    placeholder="https://certificates.example.com/verify/123"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select value={formData.visibility} onValueChange={(value) => setFormData({...formData, visibility: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleSave} className="w-full">
                  {editingId ? 'Update' : 'Add'} Education
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {educations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No education added yet. Click "Add Education" to get started.
            </p>
          ) : (
            educations.map((edu) => (
              <div key={edu.id} className="border-l-2 border-primary pl-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{edu.institution_name}</h3>
                    <p className="text-muted-foreground">
                      {edu.degree_type && `${edu.degree_type.charAt(0).toUpperCase() + edu.degree_type.slice(1)}`}
                      {edu.field_of_study && ` in ${edu.field_of_study}`}
                    </p>
                  </div>
                  {!isReadOnly && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(edu)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(edu.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {edu.start_date && format(new Date(edu.start_date), 'MMM yyyy')} - {edu.is_current ? 'Present' : edu.end_date ? format(new Date(edu.end_date), 'MMM yyyy') : 'N/A'}
                  </div>
                  {edu.grade && <Badge variant="outline">Grade: {edu.grade}</Badge>}
                  {edu.certificate_verified && (
                    <Badge variant="default" className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </Badge>
                  )}
                </div>

                {edu.description && (
                  <p className="text-sm">{edu.description}</p>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};