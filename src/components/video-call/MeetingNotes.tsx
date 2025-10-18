import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, Download, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface MeetingNotesProps {
  meetingId: string;
  meetingTitle: string;
}

export function MeetingNotes({ meetingId, meetingTitle }: MeetingNotesProps) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('meetings')
        .update({ 
          settings: { 
            notes,
            notes_updated_at: new Date().toISOString() 
          } 
        })
        .eq('id', meetingId);

      if (error) throw error;
      toast.success('Notes saved successfully');
    } catch (error) {
      console.error('[Notes] Failed to save:', error);
      toast.error('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([notes], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meetingTitle.replace(/\s+/g, '_')}_notes_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Notes downloaded');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(notes);
      setCopied(true);
      toast.success('Notes copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy notes');
    }
  };

  return (
    <Card className="flex flex-col h-full backdrop-blur-xl bg-black/60 border-white/10">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="font-semibold">Meeting Notes</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            disabled={!notes}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            disabled={!notes}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!notes || saving}
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Take notes during the meeting...

• Key discussion points
• Action items
• Decisions made
• Next steps"
          className="min-h-[400px] bg-transparent border-none resize-none focus-visible:ring-0"
        />
      </ScrollArea>
    </Card>
  );
}
