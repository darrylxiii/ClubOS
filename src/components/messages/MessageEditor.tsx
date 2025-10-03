import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface MessageEditorProps {
  messageId: string;
  currentContent: string;
  onSave: () => void;
  onCancel: () => void;
}

export function MessageEditor({ messageId, currentContent, onSave, onCancel }: MessageEditorProps) {
  const [content, setContent] = useState(currentContent);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) return;

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user?.id) throw new Error('User not authenticated');

      // Store edit history
      const { error: historyError } = await supabase.from('message_edits').insert({
        message_id: messageId,
        previous_content: currentContent,
        edited_by: userData.user.id,
      });

      if (historyError) throw historyError;

      // Update message
      const { error: updateError } = await supabase
        .from('messages')
        .update({
          content: content.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (updateError) throw updateError;

      toast.success('Message updated');
      onSave();
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Failed to update message');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 w-full">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[80px]"
        autoFocus
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving || !content.trim()}>
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
