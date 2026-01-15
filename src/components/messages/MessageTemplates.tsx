import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface MessageTemplatesProps {
  onSelectTemplate: (content: string) => void;
  companyId?: string;
}

export function MessageTemplates({ onSelectTemplate, companyId }: MessageTemplatesProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', category: '', content: '' });

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open, companyId]);

  const loadTemplates = async () => {
    const { data } = await supabase
      .from('message_templates')
      .select('*')
      .eq('is_active', true)
      .or(`company_id.is.null,company_id.eq.${companyId || 'null'}`)
      .order('category');

    setTemplates(data || []);
  };

  const createTemplate = async () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await supabase.from('message_templates').insert({
        company_id: companyId,
        created_by: user?.id,
        name: newTemplate.name,
        category: newTemplate.category || 'general',
        content: newTemplate.content,
      });

      toast.success('Template created');
      setNewTemplate({ name: '', category: '', content: '' });
      setCreateOpen(false);
      loadTemplates();
    } catch (_error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const handleSelectTemplate = async (template: any) => {
    onSelectTemplate(template.content);
    
    // Increment usage count
    await supabase
      .from('message_templates')
      .update({ usage_count: (template.usage_count || 0) + 1 })
      .eq('id', template.id);

    setOpen(false);
    toast.success('Template applied');
  };

  const groupedTemplates = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Message Templates</span>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
              <div key={category} className="mb-4">
                <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-2">
                  {category}
                </h3>
                <div className="space-y-2">
                  {(categoryTemplates as any[]).map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className="w-full text-left p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {template.content}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Used {template.usage_count || 0} times
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                placeholder="e.g., Interview Invitation"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={newTemplate.category}
                onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                placeholder="e.g., interview, feedback, offer"
              />
            </div>
            <div>
              <Label>Message Content</Label>
              <Textarea
                value={newTemplate.content}
                onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                placeholder="Template message..."
                className="min-h-[150px]"
              />
            </div>
            <Button onClick={createTemplate} className="w-full">
              Create Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
