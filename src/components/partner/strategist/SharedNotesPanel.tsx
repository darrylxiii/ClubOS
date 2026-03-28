import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from '@/lib/motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, StickyNote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { StrategistNote } from '@/hooks/useStrategistChannel';

interface SharedNotesPanelProps {
  notes: StrategistNote[];
  companyId: string | undefined;
  className?: string;
}

function formatNoteTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffHour < 1) return 'Just now';
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function getInitials(name: string): string {
  return name
    .split('')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function SharedNotesPanel({ notes, companyId, className }: SharedNotesPanelProps) {
  const { t } = useTranslation('partner');
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newNote.trim() || !companyId) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('crm_activities').insert({
        company_id: companyId,
        type: 'note',
        notes: newNote.trim(),
        created_by: user.id,
      } as any);

      if (error) throw error;

      setNewNote('');
      toast.success(t('strategist.noteSent', 'Note added'));
      queryClient.invalidateQueries({ queryKey: ['strategist-channel-notes', companyId] });
    } catch (err) {
      console.error('[SharedNotesPanel] Error adding note:', err);
      toast.error(t('strategist.noteError', 'Failed to add note'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`rounded-xl bg-card/30 backdrop-blur border border-border/20 p-4 space-y-4 ${className || ''}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <StickyNote className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">
          {t('strategist.sharedNotes', 'Shared Notes')}
        </h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </span>
      </div>

      {/* Notes list */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t('strategist.noNotes', 'No notes yet. Start a conversation with your strategist.')}
            </p>
          ) : (
            notes.map((note, index) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: index * 0.03, duration: 0.2 }}
                className="flex gap-3 p-3 rounded-lg bg-card/20 border border-border/10"
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={note.author_avatar || undefined} alt={note.author_name} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {getInitials(note.author_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium truncate">{note.author_name}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatNoteTime(note.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap break-words">
                    {note.content}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Add note */}
      <div className="space-y-2 pt-2 border-t border-border/20">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder={t('strategist.addNotePlaceholder', 'Add a note for your strategist...')}
          className="min-h-[72px] resize-none bg-card/50 text-sm"
          disabled={submitting}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!newNote.trim() || submitting || !companyId}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {submitting
              ? t('strategist.sending', 'Sending...')
              : t('strategist.addNote', 'Add Note')}
          </Button>
        </div>
      </div>
    </div>
  );
}
