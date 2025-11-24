import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Copy, Zap, Briefcase, Users, Calendar, Clock, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface MeetingTemplate {
  id: string;
  name: string;
  icon: string;
  description: string | null;
  default_title: string;
  default_duration: number;
  access_type: string;
  allow_guests: boolean;
  require_approval: boolean;
  enable_notetaker: boolean;
  enable_recording: boolean;
  compliance_mode: string | null;
  is_public: boolean;
  usage_count: number;
  created_at: string;
}

export default function MeetingTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<MeetingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MeetingTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: '📅',
    description: '',
    default_title: '',
    default_duration: 60,
    access_type: 'public' as 'public' | 'private' | 'restricted',
    allow_guests: true,
    require_approval: false,
    enable_notetaker: true,
    enable_recording: false,
    compliance_mode: null as string | null,
    is_public: false,
  });

  useEffect(() => {
    loadTemplates();
  }, [user]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('meeting_templates')
        .select('*')
        .or(`user_id.eq.${user?.id},is_public.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      if (!formData.name || !formData.default_title) {
        toast.error('Please fill in required fields');
        return;
      }

      const templateData = {
        ...formData,
        user_id: user?.id,
        updated_at: new Date().toISOString(),
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from('meeting_templates')
          .update(templateData)
          .eq('id', editingTemplate.id);

        if (error) throw error;
        toast.success('Template updated successfully');
      } else {
        const { error } = await supabase
          .from('meeting_templates')
          .insert([templateData]);

        if (error) throw error;
        toast.success('Template created successfully');
      }

      setDialogOpen(false);
      setEditingTemplate(null);
      resetForm();
      loadTemplates();
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('meeting_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Template deleted');
      loadTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleDuplicateTemplate = async (template: MeetingTemplate) => {
    try {
      const { error } = await supabase
        .from('meeting_templates')
        .insert([{
          ...template,
          id: undefined,
          name: `${template.name} (Copy)`,
          user_id: user?.id,
          usage_count: 0,
          created_at: new Date().toISOString(),
        }]);

      if (error) throw error;
      toast.success('Template duplicated');
      loadTemplates();
    } catch (error: any) {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      icon: '📅',
      description: '',
      default_title: '',
      default_duration: 60,
      access_type: 'public',
      allow_guests: true,
      require_approval: false,
      enable_notetaker: true,
      enable_recording: false,
      compliance_mode: null,
      is_public: false,
    });
  };

  const openEditDialog = (template: MeetingTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      icon: template.icon,
      description: template.description || '',
      default_title: template.default_title,
      default_duration: template.default_duration,
      access_type: template.access_type as 'public' | 'private' | 'restricted',
      allow_guests: template.allow_guests,
      require_approval: template.require_approval,
      enable_notetaker: template.enable_notetaker,
      enable_recording: template.enable_recording,
      compliance_mode: template.compliance_mode,
      is_public: template.is_public,
    });
    setDialogOpen(true);
  };

  const templateIcons = ['📅', '💼', '👥', '🎯', '🚀', '⚡', '🎓', '🎤', '📊', '💡'];

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Meeting Templates</h1>
            <p className="text-muted-foreground mt-1">
              Create reusable templates for common meeting types
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingTemplate(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle>
                <DialogDescription>
                  Define settings for quick meeting creation
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Quick Interview"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="icon">Icon</Label>
                    <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {templateIcons.map((icon) => (
                          <SelectItem key={icon} value={icon}>
                            <span className="text-xl">{icon}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="For candidate interviews with standardized settings"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default_title">Default Title *</Label>
                    <Input
                      id="default_title"
                      value={formData.default_title}
                      onChange={(e) => setFormData({ ...formData, default_title: e.target.value })}
                      placeholder="Interview with {candidate}"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.default_duration}
                      onChange={(e) => setFormData({ ...formData, default_duration: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="access_type">Access Type</Label>
                    <Select value={formData.access_type} onValueChange={(value: any) => setFormData({ ...formData, access_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="restricted">Restricted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="compliance">Compliance Mode</Label>
                    <Select value={formData.compliance_mode || 'none'} onValueChange={(value) => setFormData({ ...formData, compliance_mode: value === 'none' ? null : value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="gdpr">GDPR</SelectItem>
                        <SelectItem value="hipaa">HIPAA</SelectItem>
                        <SelectItem value="sox">SOX</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="allow_guests">Allow Guests</Label>
                    <Switch
                      id="allow_guests"
                      checked={formData.allow_guests}
                      onCheckedChange={(checked) => setFormData({ ...formData, allow_guests: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="require_approval">Require Approval</Label>
                    <Switch
                      id="require_approval"
                      checked={formData.require_approval}
                      onCheckedChange={(checked) => setFormData({ ...formData, require_approval: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enable_notetaker">Enable AI Notetaker</Label>
                    <Switch
                      id="enable_notetaker"
                      checked={formData.enable_notetaker}
                      onCheckedChange={(checked) => setFormData({ ...formData, enable_notetaker: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enable_recording">Enable Recording</Label>
                    <Switch
                      id="enable_recording"
                      checked={formData.enable_recording}
                      onCheckedChange={(checked) => setFormData({ ...formData, enable_recording: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_public">Make Public Template</Label>
                    <Switch
                      id="is_public"
                      checked={formData.is_public}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveTemplate}>
                  {editingTemplate ? 'Update' : 'Create'} Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first meeting template for quick scheduling
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{template.icon}</span>
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.is_public && (
                          <Badge variant="secondary" className="mt-1">Public</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleDuplicateTemplate(template)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(template)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTemplate(template.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {template.description && (
                    <CardDescription className="mt-2">{template.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{template.default_duration} min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span>{template.access_type}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {template.allow_guests && (
                      <Badge variant="outline" className="text-xs">Guests</Badge>
                    )}
                    {template.enable_notetaker && (
                      <Badge variant="outline" className="text-xs">AI Notes</Badge>
                    )}
                    {template.enable_recording && (
                      <Badge variant="outline" className="text-xs">Recording</Badge>
                    )}
                    {template.compliance_mode && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        {template.compliance_mode.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Used {template.usage_count} times
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
