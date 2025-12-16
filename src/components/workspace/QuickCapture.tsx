import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Link, ImageIcon, Plus, Loader2 } from 'lucide-react';
import { useWorkspacePages } from '@/hooks/useWorkspacePages';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface QuickCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CaptureMode = 'note' | 'url' | 'image';

export function QuickCapture({ open, onOpenChange }: QuickCaptureProps) {
  const navigate = useNavigate();
  const { createPage } = useWorkspacePages();
  const [mode, setMode] = useState<CaptureMode>('note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setMode('note');
      setTitle('');
      setContent('');
      setUrl('');
      setImageUrl('');
    }
  }, [open]);

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        onOpenChange(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);

    try {
      let pageContent: any[] = [];
      let pageTitle = title;

      if (mode === 'note') {
        if (!content.trim()) {
          toast.error('Please enter some content');
          return;
        }
        pageTitle = title || 'Quick Note';
        pageContent = [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: content }],
          },
        ];
      } else if (mode === 'url') {
        if (!url.trim()) {
          toast.error('Please enter a URL');
          return;
        }

        try {
          new URL(url);
        } catch {
          toast.error('Please enter a valid URL');
          return;
        }

        // Fetch metadata for the URL
        const { data: metadata } = await supabase.functions.invoke('fetch-link-metadata', {
          body: { url },
        });

        pageTitle = title || metadata?.title || 'Captured Link';
        pageContent = [
          {
            type: 'linkPreview',
            props: {
              url,
              title: metadata?.title || '',
              description: metadata?.description || '',
              image: metadata?.image || '',
              siteName: metadata?.siteName || new URL(url).hostname,
            },
          },
        ];
      } else if (mode === 'image') {
        if (!imageUrl.trim()) {
          toast.error('Please enter an image URL');
          return;
        }

        pageTitle = title || 'Captured Image';
        pageContent = [
          {
            type: 'image',
            props: {
              url: imageUrl,
            },
          },
        ];
      }

      const newPage = await createPage.mutateAsync({
        title: pageTitle,
        content: pageContent,
      });

      toast.success('Page created');
      onOpenChange(false);
      navigate(`/pages/${newPage.id}`);
    } catch (error) {
      console.error('Failed to create capture:', error);
      toast.error('Failed to create page');
    } finally {
      setIsSubmitting(false);
    }
  }, [mode, title, content, url, imageUrl, createPage, navigate, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Quick Capture
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as CaptureMode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="note" className="gap-2">
              <FileText className="h-4 w-4" />
              Note
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-2">
              <Link className="h-4 w-4" />
              URL
            </TabsTrigger>
            <TabsTrigger value="image" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Image
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            <div>
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                placeholder="Page title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <TabsContent value="note" className="mt-0">
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Start typing..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
              </div>
            </TabsContent>

            <TabsContent value="url" className="mt-0">
              <div>
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Will create a link preview with metadata
                </p>
              </div>
            </TabsContent>

            <TabsContent value="image" className="mt-0">
              <div>
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                {imageUrl && (
                  <div className="mt-2 rounded border overflow-hidden">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="max-h-32 w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Page
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Tip: Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">⌘⇧C</kbd> to open Quick Capture from anywhere
        </p>
      </DialogContent>
    </Dialog>
  );
}
