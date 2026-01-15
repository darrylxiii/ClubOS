import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, ListPlus, FolderPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface AddToListDialogProps {
  candidateId: string;
  candidateName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface TalentPoolList {
  id: string;
  name: string;
  description: string | null;
  color: string;
  candidate_count: number;
  list_type: string;
}

export function AddToListDialog({
  candidateId,
  candidateName,
  open,
  onOpenChange,
  onSuccess,
}: AddToListDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');

  // Fetch available lists
  const { data: lists, isLoading: listsLoading } = useQuery({
    queryKey: ['talent-pool-lists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('talent_pool_lists')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as TalentPoolList[];
    },
    enabled: open,
  });

  // Check which lists the candidate is already in
  const { data: existingMemberships } = useQuery({
    queryKey: ['candidate-list-memberships', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('talent_pool_list_members')
        .select('list_id')
        .eq('candidate_id', candidateId);

      if (error) throw error;
      return data.map((m) => m.list_id);
    },
    enabled: open && !!candidateId,
  });

  // Add to lists mutation
  const addToListsMutation = useMutation({
    mutationFn: async () => {
      const memberships = selectedListIds.map((listId) => ({
        list_id: listId,
        candidate_id: candidateId,
        added_by: user?.id,
        notes: notes || null,
      }));

      const { error } = await supabase
        .from('talent_pool_list_members')
        .insert(memberships);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talent-pool-lists'] });
      queryClient.invalidateQueries({ queryKey: ['candidate-list-memberships', candidateId] });
      toast.success(`Added to ${selectedListIds.length} list(s)`);
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error('Failed to add to lists: ' + error.message);
    },
  });

  // Create new list mutation
  const createListMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('talent_pool_lists')
        .insert({
          name: newListName,
          description: newListDescription || null,
          created_by: user?.id,
          list_type: 'manual',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newList) => {
      queryClient.invalidateQueries({ queryKey: ['talent-pool-lists'] });
      setSelectedListIds([...selectedListIds, newList.id]);
      setShowCreateNew(false);
      setNewListName('');
      setNewListDescription('');
      toast.success('List created');
    },
    onError: (error) => {
      toast.error('Failed to create list: ' + error.message);
    },
  });

  const resetForm = () => {
    setSelectedListIds([]);
    setNotes('');
    setShowCreateNew(false);
    setNewListName('');
    setNewListDescription('');
  };

  const toggleList = (listId: string) => {
    if (selectedListIds.includes(listId)) {
      setSelectedListIds(selectedListIds.filter((id) => id !== listId));
    } else {
      setSelectedListIds([...selectedListIds, listId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedListIds.length === 0) {
      toast.error('Please select at least one list');
      return;
    }
    addToListsMutation.mutate();
  };

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) {
      toast.error('Please enter a list name');
      return;
    }
    createListMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="h-5 w-5" />
            Add to List
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Add {candidateName} to one or more lists
          </p>
        </DialogHeader>

        {showCreateNew ? (
          <form onSubmit={handleCreateList} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="list-name">List Name</Label>
              <Input
                id="list-name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g., CMO Pipeline Q1"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="list-description">Description (optional)</Label>
              <Textarea
                id="list-description"
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                placeholder="Brief description of this list..."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateNew(false)}
                disabled={createListMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createListMutation.isPending}>
                {createListMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Create List'
                )}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Lists */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Lists</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreateNew(true)}
                  className="h-8"
                >
                  <FolderPlus className="h-3.5 w-3.5 mr-1" />
                  New List
                </Button>
              </div>

              <ScrollArea className="h-[200px] border rounded-lg p-2">
                {listsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : lists?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <p className="text-sm">No lists yet</p>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setShowCreateNew(true)}
                    >
                      Create your first list
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {lists?.map((list) => {
                      const isAlreadyMember = existingMemberships?.includes(list.id);
                      const isSelected = selectedListIds.includes(list.id);

                      return (
                        <div
                          key={list.id}
                          className={cn(
                            'flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors',
                            isAlreadyMember && 'opacity-50 cursor-not-allowed',
                            isSelected && !isAlreadyMember && 'bg-primary/10'
                          )}
                          onClick={() => !isAlreadyMember && toggleList(list.id)}
                        >
                          <Checkbox
                            checked={isSelected || isAlreadyMember}
                            disabled={isAlreadyMember}
                            onCheckedChange={() => !isAlreadyMember && toggleList(list.id)}
                          />
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: list.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {list.name}
                              {isAlreadyMember && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  (already added)
                                </span>
                              )}
                            </p>
                            {list.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {list.description}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {list.candidate_count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Why are you adding this candidate to these lists?"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={addToListsMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addToListsMutation.isPending || selectedListIds.length === 0}
              >
                {addToListsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  `Add to ${selectedListIds.length} List${selectedListIds.length !== 1 ? 's' : ''}`
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
