import { memo, useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import { Bookmark, Save, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

interface NoteEditorProps {
  moduleId: string;
  videoTimestamp?: number;
  onSaved?: () => void;
}

export const NoteEditor = memo<NoteEditorProps>(({
  moduleId,
  videoTimestamp,
  onSaved,
}) => {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const debouncedContent = useDebounce(content, 2000);

  useEffect(() => {
    const loadNotes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('module_notes' as any)
        .select('*')
        .eq('module_id', moduleId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setContent((data as any).content);
      }
    };

    loadNotes();
  }, [moduleId]);

  useEffect(() => {
    if (debouncedContent && debouncedContent !== '') {
      saveNote(false);
    }
  }, [debouncedContent]);

  const saveNote = async (showToast = true) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !content.trim()) return;

    setSaving(true);
    try {
      await supabase
        .from('module_notes' as any)
        .upsert({
          module_id: moduleId,
          user_id: user.id,
          content: content,
          video_timestamp_seconds: videoTimestamp,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'module_id,user_id',
        });

      setLastSaved(new Date());
      if (showToast) {
        notify.success('Note saved');
      }
      onSaved?.();
    } catch (error) {
      console.error('Error saving note:', error);
      if (showToast) {
        notify.error('Failed to save note');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBookmark = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await supabase.from('module_notes' as any).insert({
        module_id: moduleId,
        user_id: user.id,
        content: `Bookmark at ${Math.floor(videoTimestamp || 0)}s`,
        video_timestamp_seconds: videoTimestamp,
        is_bookmark: true,
      });

      notify.success('Bookmark added');
    } catch (error) {
      console.error('Error adding bookmark:', error);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Notes</label>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {saving && (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {lastSaved && !saving && (
            <span>Saved {lastSaved.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Take notes while you learn... Auto-saves every 2 seconds"
        className="min-h-[120px] resize-none"
      />

      <div className="flex gap-2">
        {videoTimestamp !== undefined && (
          <Button variant="outline" size="sm" onClick={handleBookmark}>
            <Bookmark className="w-4 h-4 mr-2" />
            Bookmark
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => saveNote(true)}>
          <Save className="w-4 h-4 mr-2" />
          Save Now
        </Button>
      </div>
    </Card>
  );
});

NoteEditor.displayName = 'NoteEditor';
