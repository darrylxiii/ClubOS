import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { EntityContextPicker, SelectedEntity } from '@/components/shared/EntityContextPicker';
import { 
  Upload, Phone, MessageSquare, Linkedin, FileText, 
  Calendar, File, Loader2, X, AlertCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ContentType = 'call_recording' | 'whatsapp_export' | 'linkedin_export' | 'email_thread' | 'meeting_notes' | 'document' | 'other';

interface ExternalContentImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEntity?: SelectedEntity;
  defaultContentType?: ContentType;
}

const contentTypeConfig: Record<ContentType, { icon: any; label: string; description: string; acceptedFiles: string }> = {
  call_recording: {
    icon: Phone,
    label: 'Call Recording',
    description: 'Audio/video recordings from phone calls or video meetings',
    acceptedFiles: 'audio/*,video/*',
  },
  whatsapp_export: {
    icon: MessageSquare,
    label: 'WhatsApp Export',
    description: 'Exported WhatsApp chat history (.txt file)',
    acceptedFiles: '.txt,text/plain',
  },
  linkedin_export: {
    icon: Linkedin,
    label: 'LinkedIn Messages',
    description: 'LinkedIn conversation exports or copied messages',
    acceptedFiles: '.txt,.csv,text/plain',
  },
  email_thread: {
    icon: FileText,
    label: 'Email Thread',
    description: 'Email conversation threads or exports',
    acceptedFiles: '.eml,.txt,.pdf',
  },
  meeting_notes: {
    icon: Calendar,
    label: 'Meeting Notes',
    description: 'Notes from meetings, calls, or interviews',
    acceptedFiles: '.txt,.md,.pdf,.doc,.docx',
  },
  document: {
    icon: File,
    label: 'Document',
    description: 'General documents, contracts, or files',
    acceptedFiles: '.pdf,.doc,.docx,.txt',
  },
  other: {
    icon: File,
    label: 'Other',
    description: 'Other contextual content',
    acceptedFiles: '*',
  },
};

const sourcePlatforms = [
  { value: 'zoom', label: 'Zoom' },
  { value: 'teams', label: 'Microsoft Teams' },
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'email', label: 'Email' },
  { value: 'in_person', label: 'In-Person' },
  { value: 'external', label: 'External' },
  { value: 'other', label: 'Other' },
];

export function ExternalContentImportModal({
  open,
  onOpenChange,
  defaultEntity,
  defaultContentType,
}: ExternalContentImportModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [contentType, setContentType] = useState<ContentType>(defaultContentType || 'call_recording');
  const [primaryEntity, setPrimaryEntity] = useState<SelectedEntity | null>(defaultEntity || null);
  const [secondaryEntity, setSecondaryEntity] = useState<SelectedEntity | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pastedContent, setPastedContent] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [originalDate, setOriginalDate] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<string>('');
  const [sourcePlatform, setSourcePlatform] = useState<string>('');
  const [participants, setParticipants] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');

  const config = contentTypeConfig[contentType];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const uploadedFile = acceptedFiles[0];
      setFile(uploadedFile);
      if (!title) {
        setTitle(uploadedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  }, [title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 524288000, // 500MB
    accept: config.acceptedFiles === '*' ? undefined : 
      config.acceptedFiles.split(',').reduce((acc, type) => {
        if (type.includes('*')) {
          acc[type] = [];
        } else if (type.startsWith('.')) {
          acc['application/octet-stream'] = [...(acc['application/octet-stream'] || []), type];
        } else {
          acc[type] = [];
        }
        return acc;
      }, {} as Record<string, string[]>),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!primaryEntity) throw new Error('Primary entity is required');
      if (!file && !pastedContent) throw new Error('File or content is required');
      if (!title) throw new Error('Title is required');

      let fileUrl: string | null = null;
      let fileName: string | null = null;
      let fileSizeKb: number | null = null;
      let mimeType: string | null = null;

      // Upload file if provided
      if (file) {
        const filePath = `${user?.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('external-imports')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('external-imports')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
        fileName = file.name;
        fileSizeKb = Math.round(file.size / 1024);
        mimeType = file.type;
      }

      // Create the import record
      const { data, error } = await supabase
        .from('external_context_imports')
        .insert({
          content_type: contentType,
          title,
          description: description || null,
          file_url: fileUrl,
          file_name: fileName,
          file_size_kb: fileSizeKb,
          mime_type: mimeType,
          entity_type: primaryEntity.type,
          entity_id: primaryEntity.id,
          secondary_entity_type: secondaryEntity?.type || null,
          secondary_entity_id: secondaryEntity?.id || null,
          raw_content: pastedContent || null,
          source_platform: sourcePlatform || null,
          original_date: originalDate ? new Date(originalDate).toISOString() : null,
          duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
          participants: participants ? participants.split(',').map(p => p.trim()).filter(Boolean) : [],
          urgency_level: urgencyLevel,
          uploaded_by: user?.id,
          processing_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger processing
      await supabase.functions.invoke('process-external-import', {
        body: { import_id: data.id },
      });

      return data;
    },
    onSuccess: () => {
      toast.success('Content imported successfully', {
        description: 'AI is now processing and extracting insights.',
      });
      queryClient.invalidateQueries({ queryKey: ['external-imports'] });
      handleClose();
    },
    onError: (error: Error) => {
      toast.error('Failed to import content', {
        description: error.message,
      });
    },
  });

  const handleClose = () => {
    setContentType(defaultContentType || 'call_recording');
    setPrimaryEntity(defaultEntity || null);
    setSecondaryEntity(null);
    setFile(null);
    setPastedContent('');
    setTitle('');
    setDescription('');
    setOriginalDate('');
    setDurationMinutes('');
    setSourcePlatform('');
    setParticipants('');
    setUrgencyLevel('normal');
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    importMutation.mutate();
  };

  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import External Content
          </DialogTitle>
          <DialogDescription>
            Import call recordings, WhatsApp chats, or other context to link with entities
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Content Type Selection */}
          <div className="space-y-2">
            <Label>Content Type</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(contentTypeConfig) as ContentType[]).map((type) => {
                const typeConfig = contentTypeConfig[type];
                const TypeIcon = typeConfig.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setContentType(type)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all text-center",
                      contentType === type
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <TypeIcon className="h-5 w-5" />
                    <span className="text-xs font-medium">{typeConfig.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>

          <Separator />

          {/* Entity Assignment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EntityContextPicker
              label="Primary Entity *"
              value={primaryEntity}
              onChange={setPrimaryEntity}
              placeholder="Who/what is this about?"
            />
            <EntityContextPicker
              label="Secondary Entity (Optional)"
              value={secondaryEntity}
              onChange={setSecondaryEntity}
              placeholder="Additional context..."
            />
          </div>

          <Separator />

          {/* File Upload or Paste Content */}
          <div className="space-y-4">
            <Label>Content</Label>
            
            {/* File Dropzone */}
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                file && "border-primary bg-primary/5"
              )}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <Icon className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm">
                    {isDragActive
                      ? 'Drop the file here...'
                      : 'Drag & drop a file here, or click to select'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Max size: 500MB • {config.acceptedFiles}
                  </p>
                </>
              )}
            </div>

            {/* Or paste content */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or paste content directly
                </span>
              </div>
            </div>

            <Textarea
              placeholder="Paste WhatsApp export, LinkedIn messages, or any text content here..."
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
              rows={4}
            />
          </div>

          <Separator />

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Call with John about Product Role"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="original-date">Original Date</Label>
              <Input
                id="original-date"
                type="datetime-local"
                value={originalDate}
                onChange={(e) => setOriginalDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-platform">Source Platform</Label>
              <Select value={sourcePlatform} onValueChange={setSourcePlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Where did this happen?" />
                </SelectTrigger>
                <SelectContent>
                  {sourcePlatforms.map((platform) => (
                    <SelectItem key={platform.value} value={platform.value}>
                      {platform.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(contentType === 'call_recording' || contentType === 'meeting_notes') && (
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="e.g., 30"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="participants">Participants</Label>
              <Input
                id="participants"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                placeholder="John Doe, Jane Smith (comma separated)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgency">Urgency Level</Label>
              <Select value={urgencyLevel} onValueChange={(v) => setUrgencyLevel(v as typeof urgencyLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional context about this import..."
              rows={2}
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              AI will automatically extract insights and action items
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!primaryEntity || (!file && !pastedContent) || !title || importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import Content'
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
