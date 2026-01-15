import { useState } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { useTheme } from 'next-themes';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Eye, EyeOff, Trash2, ArrowLeft } from 'lucide-react';
import { useTemplates, Template } from '@/hooks/useTemplates';
import { cn } from '@/lib/utils';

interface TemplateEditorProps {
  template?: Template;
  onSave?: (template: Template) => void;
  onCancel?: () => void;
}

const CATEGORIES = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'meeting-notes', label: 'Meeting Notes' },
  { value: 'project', label: 'Project Management' },
  { value: 'recruitment', label: 'Recruitment' },
  { value: 'documentation', label: 'Documentation' },
  { value: 'custom', label: 'Custom' },
];

const EMOJI_OPTIONS = ['📄', '📝', '📋', '📊', '💼', '🎯', '✅', '📌', '💡', '🚀', '⭐', '🔥'];

export function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const { resolvedTheme } = useTheme();
  const { createTemplate, updateTemplate, deleteTemplate } = useTemplates();
  
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [icon, setIcon] = useState(template?.icon || '📄');
  const [category, setCategory] = useState(template?.category || 'custom');
  const [visibility, setVisibility] = useState<'system' | 'company' | 'personal'>(
    template?.visibility || 'system'
  );
  const [coverUrl, setCoverUrl] = useState(template?.cover_url || '');
  const [showPreview, setShowPreview] = useState(false);

  const editor = useCreateBlockNote({
    initialContent: template?.content?.length ? template.content : undefined,
  });

  const handleSave = async () => {
    const content = editor.document;

    if (template) {
      const result = await updateTemplate.mutateAsync({
        id: template.id,
        updates: { name, description, icon, category, visibility, cover_url: coverUrl || null, content },
      });
      onSave?.(result);
    } else {
      const result = await createTemplate.mutateAsync({
        name, description, icon, category, visibility, cover_url: coverUrl || undefined, content, source_type: 'manual',
      });
      onSave?.(result);
    }
  };

  const handleDelete = async () => {
    if (!template) return;
    if (confirm('Are you sure you want to delete this template?')) {
      await deleteTemplate.mutateAsync(template.id);
      onCancel?.();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h2 className="text-xl font-semibold">{template ? 'Edit Template' : 'Create Template'}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showPreview ? 'Edit' : 'Preview'}
          </Button>
          {template && (
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleteTemplate.isPending}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          <Button onClick={handleSave} disabled={!name.trim() || createTemplate.isPending || updateTemplate.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createTemplate.isPending || updateTemplate.isPending ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4 space-y-4 lg:col-span-1">
          <h3 className="font-medium">Template Details</h3>
          
          <div className="flex items-start gap-3">
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger className="w-16 h-12 text-2xl">
                <SelectValue>{icon}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {EMOJI_OPTIONS.map((e) => (
                  <SelectItem key={e} value={e} className="text-2xl">{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1 space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" rows={3} />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System (All Users)</SelectItem>
                <SelectItem value="company">Company Only</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cover Image URL</Label>
            <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
          </div>
        </Card>

        <Card className={cn("lg:col-span-2 overflow-hidden", showPreview && "pointer-events-none")}>
          <div className="p-4 border-b">
            <h3 className="font-medium">Template Content</h3>
          </div>
          <div className="min-h-[400px]">
            <BlockNoteView editor={editor} editable={!showPreview} theme={resolvedTheme === 'dark' ? 'dark' : 'light'} />
          </div>
        </Card>
      </div>
    </div>
  );
}
