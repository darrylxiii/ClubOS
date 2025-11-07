import { useState, useEffect } from 'react';
import { useTaskBoard } from '@/contexts/TaskBoardContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BoardMembersView } from './BoardMembersView';
import { BoardInvitationForm } from './BoardInvitationForm';
import { Settings, Users, Mail, AlertTriangle } from 'lucide-react';

interface BoardSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BoardSettingsDialog({ open, onOpenChange }: BoardSettingsDialogProps) {
  const { currentBoard, refreshBoards } = useTaskBoard();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentBoard) {
      setName(currentBoard.name);
      setDescription(currentBoard.description || '');
    }
  }, [currentBoard]);

  if (!currentBoard) return null;

  const canManage = currentBoard.my_role === 'owner' || currentBoard.my_role === 'admin';

  const handleUpdateBoard = async () => {
    if (!name.trim()) {
      toast.error('Board name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('task_boards')
        .update({
          name: name.trim(),
          description: description.trim() || null,
        })
        .eq('id', currentBoard.id);

      if (error) throw error;

      toast.success('Board updated successfully');
      await refreshBoards();
    } catch (error) {
      console.error('Failed to update board:', error);
      toast.error('Failed to update board');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveBoard = async () => {
    if (!confirm('Are you sure you want to archive this board? It will be hidden but not deleted.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('task_boards')
        .update({ is_archived: true })
        .eq('id', currentBoard.id);

      if (error) throw error;

      toast.success('Board archived');
      onOpenChange(false);
      await refreshBoards();
    } catch (error) {
      console.error('Failed to archive board:', error);
      toast.error('Failed to archive board');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{currentBoard.icon}</span>
            <span>{currentBoard.name} Settings</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="invite" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Invite
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="board-name">Board Name</Label>
              <Input
                id="board-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canManage}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="board-description">Description</Label>
              <Textarea
                id="board-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={!canManage}
              />
            </div>

            {canManage && (
              <Button onClick={handleUpdateBoard} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            )}

            {currentBoard.my_role === 'owner' && currentBoard.visibility !== 'company' && (
              <div className="pt-6 border-t space-y-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-destructive">Danger Zone</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Archive this board. It will be hidden but can be restored later.
                    </p>
                    <Button variant="outline" onClick={handleArchiveBoard} className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                      Archive Board
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="members">
            <BoardMembersView boardId={currentBoard.id} canManage={canManage} />
          </TabsContent>

          <TabsContent value="invite">
            {canManage ? (
              <BoardInvitationForm boardId={currentBoard.id} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Only board owners and admins can invite members.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
