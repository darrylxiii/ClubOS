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
import { MoreVertical, Edit3, Trash2, MessageSquare, Languages } from 'lucide-react';
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

  const handleTranslate = async (language: string) => {
    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-message', {
        body: {
          text: message.content,
          targetLanguage: language,
        },
      });

      if (error) throw error;

      toast.success(`Translated to ${language}`, {
        description: data.translatedText,
        duration: 5000,
      });
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
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onReply}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Reply in thread
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
          <DropdownMenuItem onClick={() => handleTranslate('Dutch')} disabled={translating}>
            <Languages className="h-4 w-4 mr-2" />
            Translate to Dutch
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleTranslate('English')} disabled={translating}>
            <Languages className="h-4 w-4 mr-2" />
            Translate to English
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
    </>
  );
}
