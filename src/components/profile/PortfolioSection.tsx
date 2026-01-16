import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Folder, Edit, Trash2, ExternalLink, Github, Eye, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Portfolio {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  thumbnail_url: string | null;
  project_url: string | null;
  github_url: string | null;
  tags: string[];
  featured: boolean | null;
  views_count: number | null;
  likes_count: number | null;
}

interface PortfolioSectionProps {
  userId?: string;
  isReadOnly?: boolean;
}

export const PortfolioSection = ({ userId, isReadOnly = false }: PortfolioSectionProps = {}) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const [items, setItems] = useState<Portfolio[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'project',
    thumbnail_url: '',
    project_url: '',
    github_url: '',
    tags: '',
    featured: false,
    visibility: 'public'
  });

  const types = ['all', 'project', 'code', 'design', 'video', 'presentation', 'article', 'case_study'];

  useEffect(() => {
    loadPortfolio();
  }, [targetUserId]);

  const loadPortfolio = async () => {
    if (!targetUserId) return;
    const { data, error } = await supabase
      .from('profile_portfolio')
      .select('*')
      .eq('user_id', targetUserId)
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading portfolio:', error);
      return;
    }
    const mappedData = (data || []).map((item: any) => ({
      ...item,
      tags: Array.isArray(item.tags) ? item.tags : []
    }));
    setItems(mappedData);
  };

  const handleSave = async () => {
    if (!user || !targetUserId) return;

    const payload = {
      user_id: targetUserId,
      ...formData,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    };

    if (editingId) {
      const { error } = await supabase
        .from('profile_portfolio')
        .update(payload)
        .eq('id', editingId);
      
      if (error) {
        toast.error('Failed to update portfolio item');
        return;
      }
      toast.success('Portfolio item updated');
    } else {
      const { error } = await supabase
        .from('profile_portfolio')
        .insert(payload);
      
      if (error) {
        toast.error('Failed to add portfolio item');
        return;
      }
      toast.success('Portfolio item added');
    }

    setIsDialogOpen(false);
    resetForm();
    loadPortfolio();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('profile_portfolio')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete portfolio item');
      return;
    }
    toast.success('Portfolio item deleted');
    loadPortfolio();
  };

  const handleEdit = (item: Portfolio) => {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      description: item.description || '',
      type: item.type || 'project',
      thumbnail_url: item.thumbnail_url || '',
      project_url: item.project_url || '',
      github_url: item.github_url || '',
      tags: (item.tags || []).join(', '),
      featured: item.featured || false,
      visibility: 'public'
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      type: 'project',
      thumbnail_url: '',
      project_url: '',
      github_url: '',
      tags: '',
      featured: false,
      visibility: 'public'
    });
  };

  const filteredItems = selectedType === 'all' 
    ? items 
    : items.filter(i => i.type === selectedType);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Folder className="w-5 h-5" />
            <CardTitle>Portfolio</CardTitle>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            {!isReadOnly && (
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Project
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit' : 'Add'} Portfolio Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="E-commerce Platform Redesign"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="code">Code</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="presentation">Presentation</SelectItem>
                      <SelectItem value="article">Article</SelectItem>
                      <SelectItem value="case_study">Case Study</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe your project..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project URL</Label>
                    <Input 
                      value={formData.project_url}
                      onChange={(e) => setFormData({...formData, project_url: e.target.value})}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GitHub URL</Label>
                    <Input 
                      value={formData.github_url}
                      onChange={(e) => setFormData({...formData, github_url: e.target.value})}
                      placeholder="https://github.com/..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Thumbnail URL</Label>
                  <Input 
                    value={formData.thumbnail_url}
                    onChange={(e) => setFormData({...formData, thumbnail_url: e.target.value})}
                    placeholder="https://example.com/thumbnail.jpg"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tags (comma-separated)</Label>
                  <Input 
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    placeholder="React, TypeScript, UI/UX"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({...formData, featured: e.target.checked})}
                    className="rounded"
                  />
                  <Label>Feature this project</Label>
                </div>

                <Button onClick={handleSave} className="w-full">
                  {editingId ? 'Update' : 'Add'} Project
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {types.map((type) => (
              <Badge
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedType(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
              </Badge>
            ))}
          </div>

          {filteredItems.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No portfolio items yet. Click "Add Project" to showcase your work.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredItems.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  {item.thumbnail_url && (
                    <div className="aspect-video bg-muted">
                      <img 
                        src={item.thumbnail_url} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.title}</h4>
                        {item.featured && (
                          <Badge variant="default" className="text-xs mt-1">Featured</Badge>
                        )}
                      </div>
                      {!isReadOnly && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                    )}

                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {item.views_count}
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {item.likes_count}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {item.project_url && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={item.project_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        {item.github_url && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={item.github_url} target="_blank" rel="noopener noreferrer">
                              <Github className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};