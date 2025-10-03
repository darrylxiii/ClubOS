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
import { Plus, Briefcase, Edit, Trash2, MapPin, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Experience {
  id: string;
  company_name: string;
  position_title: string;
  employment_type: string;
  location: string;
  location_type: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string;
  achievements: any;
  skills_used: any;
  visibility: string;
}

export const ExperienceSection = () => {
  const { user } = useAuth();
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    company_name: '',
    position_title: '',
    employment_type: 'fulltime',
    location: '',
    location_type: 'onsite',
    start_date: '',
    end_date: '',
    is_current: false,
    description: '',
    achievements: '',
    skills_used: '',
    visibility: 'public'
  });

  useEffect(() => {
    loadExperiences();
  }, [user]);

  const loadExperiences = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('profile_experience')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error loading experiences:', error);
      return;
    }
    setExperiences(data || []);
  };

  const handleSave = async () => {
    if (!user) return;

    const payload = {
      user_id: user.id,
      ...formData,
      end_date: formData.is_current ? null : formData.end_date,
      achievements: formData.achievements ? formData.achievements.split('\n').filter(Boolean) : [],
      skills_used: formData.skills_used ? formData.skills_used.split(',').map(s => s.trim()).filter(Boolean) : []
    };

    if (editingId) {
      const { error } = await supabase
        .from('profile_experience')
        .update(payload)
        .eq('id', editingId);
      
      if (error) {
        toast.error('Failed to update experience');
        return;
      }
      toast.success('Experience updated');
    } else {
      const { error } = await supabase
        .from('profile_experience')
        .insert(payload);
      
      if (error) {
        toast.error('Failed to add experience');
        return;
      }
      toast.success('Experience added');
    }

    setIsDialogOpen(false);
    resetForm();
    loadExperiences();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('profile_experience')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete experience');
      return;
    }
    toast.success('Experience deleted');
    loadExperiences();
  };

  const handleEdit = (exp: Experience) => {
    setEditingId(exp.id);
    setFormData({
      company_name: exp.company_name,
      position_title: exp.position_title,
      employment_type: exp.employment_type,
      location: exp.location,
      location_type: exp.location_type,
      start_date: exp.start_date,
      end_date: exp.end_date || '',
      is_current: exp.is_current,
      description: exp.description,
      achievements: exp.achievements.join('\n'),
      skills_used: exp.skills_used.join(', '),
      visibility: exp.visibility
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      company_name: '',
      position_title: '',
      employment_type: 'fulltime',
      location: '',
      location_type: 'onsite',
      start_date: '',
      end_date: '',
      is_current: false,
      description: '',
      achievements: '',
      skills_used: '',
      visibility: 'public'
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            <CardTitle>Work Experience</CardTitle>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Experience
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit' : 'Add'} Experience</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name *</Label>
                    <Input 
                      value={formData.company_name}
                      onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                      placeholder="The Quantum Club"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Position Title *</Label>
                    <Input 
                      value={formData.position_title}
                      onChange={(e) => setFormData({...formData, position_title: e.target.value})}
                      placeholder="Senior Software Engineer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Employment Type</Label>
                    <Select value={formData.employment_type} onValueChange={(value) => setFormData({...formData, employment_type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fulltime">Full-time</SelectItem>
                        <SelectItem value="parttime">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="freelance">Freelance</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Location Type</Label>
                    <Select value={formData.location_type} onValueChange={(value) => setFormData({...formData, location_type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="onsite">On-site</SelectItem>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input 
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="Amsterdam, Netherlands"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
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
                  <Label>I currently work here</Label>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe your role and responsibilities..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Key Achievements (one per line)</Label>
                  <Textarea 
                    value={formData.achievements}
                    onChange={(e) => setFormData({...formData, achievements: e.target.value})}
                    placeholder="Led team of 5 engineers&#10;Increased system performance by 40%"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Skills Used (comma-separated)</Label>
                  <Input 
                    value={formData.skills_used}
                    onChange={(e) => setFormData({...formData, skills_used: e.target.value})}
                    placeholder="React, TypeScript, Node.js, AWS"
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
                      <SelectItem value="company">Company Only</SelectItem>
                      <SelectItem value="recruiter">Recruiters Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleSave} className="w-full">
                  {editingId ? 'Update' : 'Add'} Experience
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {experiences.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No work experience added yet. Click "Add Experience" to get started.
            </p>
          ) : (
            experiences.map((exp) => (
              <div key={exp.id} className="border-l-2 border-primary pl-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{exp.position_title}</h3>
                    <p className="text-muted-foreground">{exp.company_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(exp)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(exp.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(exp.start_date), 'MMM yyyy')} - {exp.is_current ? 'Present' : exp.end_date ? format(new Date(exp.end_date), 'MMM yyyy') : 'N/A'}
                  </div>
                  {exp.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {exp.location} ({exp.location_type})
                    </div>
                  )}
                  <Badge variant="outline">{exp.employment_type}</Badge>
                </div>

                {exp.description && (
                  <p className="text-sm">{exp.description}</p>
                )}

                {exp.achievements.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Key Achievements:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {exp.achievements.map((achievement, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">{achievement}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {exp.skills_used.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {exp.skills_used.map((skill, idx) => (
                      <Badge key={idx} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};