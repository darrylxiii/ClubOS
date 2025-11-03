import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Award, Edit, Trash2, Star, ThumbsUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Skill {
  id: string;
  skill_name: string;
  category: string;
  proficiency_level: number;
  years_experience: number;
  endorsement_count: number;
  ai_verified: boolean;
}

interface SkillsSectionProps {
  userId?: string;
  isReadOnly?: boolean;
}

export const SkillsSection = ({ userId, isReadOnly = false }: SkillsSectionProps = {}) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [formData, setFormData] = useState({
    skill_name: '',
    category: 'technical',
    proficiency_level: 3,
    years_experience: 1,
    visibility: 'public'
  });

  const categories = ['all', 'technical', 'soft', 'language', 'tool', 'framework'];

  useEffect(() => {
    loadSkills();
  }, [targetUserId]);

  const loadSkills = async () => {
    if (!targetUserId) return;
    const { data, error } = await supabase
      .from('profile_skills')
      .select('*')
      .eq('user_id', targetUserId)
      .order('endorsement_count', { ascending: false });

    if (error) {
      console.error('Error loading skills:', error);
      return;
    }
    setSkills(data || []);
  };

  const handleSave = async () => {
    if (!user || !targetUserId) return;

    const payload = {
      user_id: targetUserId,
      ...formData
    };

    if (editingId) {
      const { error } = await supabase
        .from('profile_skills')
        .update(payload)
        .eq('id', editingId);
      
      if (error) {
        toast.error('Failed to update skill');
        return;
      }
      toast.success('Skill updated');
    } else {
      const { error } = await supabase
        .from('profile_skills')
        .insert(payload);
      
      if (error) {
        toast.error('Failed to add skill');
        return;
      }
      toast.success('Skill added');
    }

    setIsDialogOpen(false);
    resetForm();
    loadSkills();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('profile_skills')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete skill');
      return;
    }
    toast.success('Skill deleted');
    loadSkills();
  };

  const handleEdit = (skill: Skill) => {
    setEditingId(skill.id);
    setFormData({
      skill_name: skill.skill_name,
      category: skill.category,
      proficiency_level: skill.proficiency_level,
      years_experience: skill.years_experience,
      visibility: 'public'
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      skill_name: '',
      category: 'technical',
      proficiency_level: 3,
      years_experience: 1,
      visibility: 'public'
    });
  };

  const filteredSkills = selectedCategory === 'all' 
    ? skills 
    : skills.filter(s => s.category === selectedCategory);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            <CardTitle>Skills & Expertise</CardTitle>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            {!isReadOnly && (
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Skill
                </Button>
              </DialogTrigger>
            )}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit' : 'Add'} Skill</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Skill Name *</Label>
                  <Input 
                    value={formData.skill_name}
                    onChange={(e) => setFormData({...formData, skill_name: e.target.value})}
                    placeholder="React, Leadership, Spanish..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="soft">Soft Skills</SelectItem>
                      <SelectItem value="language">Language</SelectItem>
                      <SelectItem value="tool">Tool</SelectItem>
                      <SelectItem value="framework">Framework</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Proficiency Level (1-5)</Label>
                  <div className="flex items-center gap-4">
                    <Input 
                      type="number"
                      min="1"
                      max="5"
                      value={formData.proficiency_level}
                      onChange={(e) => setFormData({...formData, proficiency_level: parseInt(e.target.value)})}
                    />
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <Star 
                          key={level}
                          className={`w-5 h-5 ${level <= formData.proficiency_level ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Years of Experience</Label>
                  <Input 
                    type="number"
                    min="0"
                    value={formData.years_experience}
                    onChange={(e) => setFormData({...formData, years_experience: parseInt(e.target.value)})}
                  />
                </div>

                <Button onClick={handleSave} className="w-full">
                  {editingId ? 'Update' : 'Add'} Skill
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Badge>
            ))}
          </div>

          {filteredSkills.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No skills added yet. Click "Add Skill" to get started.
            </p>
          ) : (
            <div className="grid gap-4">
              {filteredSkills.map((skill) => (
                <div key={skill.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{skill.skill_name}</h4>
                        {skill.ai_verified && (
                          <Badge variant="default" className="text-xs">
                            AI Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {skill.category} • {skill.years_experience} {skill.years_experience === 1 ? 'year' : 'years'} experience
                      </p>
                    </div>
                    {!isReadOnly && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(skill)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(skill.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Proficiency</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <Star 
                            key={level}
                            className={`w-4 h-4 ${level <= skill.proficiency_level ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <Progress value={skill.proficiency_level * 20} />
                  </div>

                  {skill.endorsement_count > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ThumbsUp className="w-4 h-4" />
                      {skill.endorsement_count} {skill.endorsement_count === 1 ? 'endorsement' : 'endorsements'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};