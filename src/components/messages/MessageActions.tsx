import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ForwardMessageDialog } from './ForwardMessageDialog';
import { Message } from '@/hooks/useMessages';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Edit3, Trash2, MessageSquare, Languages, Forward } from 'lucide-react';
import { toast } from 'sonner';

interface MessageActionsProps {
  message: any;
  isOwnMessage: boolean;
  onEdit: () => void;
  onReply: () => void;
  onDelete: () => void;
}

export function MessageActions({
  message,
  isOwnMessage,
  onEdit,
  onReply,
  onDelete,
}: MessageActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', message.id);

      toast.success('Message deleted');
      onDelete();
      setDeleteOpen(false);
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleTranslate = async (languageCode: string) => {
    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-message', {
        body: {
          text: message.content,
          targetLanguage: languageCode,
        },
      });

      if (error) throw error;

      // Save translation to database for persistence
      const { error: insertError } = await supabase
        .from('message_translations')
        .upsert({
          message_id: message.id,
          language_code: languageCode,
          translated_content: data.translatedText,
        }, {
          onConflict: 'message_id,language_code'
        });

      if (insertError) {
        console.error('Error saving translation:', insertError);
        // Still show the toast even if saving failed
      }

      toast.success(`Translated successfully`, {
        description: data.translatedText,
        duration: 5000,
      });

      // We could trigger a refresh via a callback if needed
    } catch (error) {
      console.error('Error translating:', error);
      toast.error('Failed to translate message');
    } finally {
      setTranslating(false);
    }
  };


  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-primary/10 transition-all duration-200" aria-label="Message options">
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onReply}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Reply in thread
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setForwardDialogOpen(true)}>
            <Forward className="h-4 w-4 mr-2" />
            Forward message
          </DropdownMenuItem>

          {isOwnMessage && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onEdit}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit message
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete message
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleTranslate('nl')} disabled={translating}>
            <Languages className="h-4 w-4 mr-2" />
            Translate to Dutch
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleTranslate('en')} disabled={translating}>
            <Languages className="h-4 w-4 mr-2" />
            Translate to English
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleTranslate('es')} disabled={translating}>
            <Languages className="h-4 w-4 mr-2" />
            Translate to Spanish
          </DropdownMenuItem>

        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this message. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ForwardMessageDialog
        open={forwardDialogOpen}
        onOpenChange={setForwardDialogOpen}
        message={message as Message}
      />
    </>
  );
}
