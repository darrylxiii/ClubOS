import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { CustomListDialog } from "./CustomListDialog";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface CustomList {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  member_count?: number;
}

interface CustomListSelectorProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export const CustomListSelector = ({ selectedIds, onSelectionChange }: CustomListSelectorProps) => {
  const [lists, setLists] = useState<CustomList[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<CustomList | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLists();
  }, []);

  const loadLists = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('audience_lists')
        .select(`
          *,
          audience_list_members(count)
        `)
        .eq('user_id', user.user.id)
        .eq('list_type', 'custom')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const listsWithCount = data.map(list => ({
        ...list,
        member_count: list.audience_list_members?.[0]?.count || 0
      }));

      setLists(listsWithCount);
    } catch (error) {
      console.error('Error loading lists:', error);
      toast.error('Failed to load custom lists');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (listId: string) => {
    if (selectedIds.includes(listId)) {
      onSelectionChange(selectedIds.filter(id => id !== listId));
    } else {
      onSelectionChange([...selectedIds, listId]);
    }
  };

  const handleDelete = async (listId: string) => {
    try {
      const { error } = await supabase
        .from('audience_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;

      toast.success('List deleted');
      loadLists();
      onSelectionChange(selectedIds.filter(id => id !== listId));
    } catch (error) {
      console.error('Error deleting list:', error);
      toast.error('Failed to delete list');
    }
  };

  const handleSaveList = () => {
    setIsDialogOpen(false);
    setEditingList(null);
    loadLists();
  };

  if (loading) {
    return <div className="text-center py-4 text-muted-foreground">Loading lists...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Select Custom Lists</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingList(null);
            setIsDialogOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          New List
        </Button>
      </div>

      {lists.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No custom lists yet.</p>
          <p className="text-sm">Create one to organize your audience</p>
        </div>
      ) : (
        <ScrollArea className="h-[240px] pr-4">
          <div className="space-y-2">
            {lists.map((list) => (
              <div
                key={list.id}
                className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors"
              >
                <Checkbox
                  id={`list-${list.id}`}
                  checked={selectedIds.includes(list.id)}
                  onCheckedChange={() => handleToggle(list.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <Label
                    htmlFor={`list-${list.id}`}
                    className="font-medium cursor-pointer flex items-center gap-2"
                  >
                    {list.icon && <span>{list.icon}</span>}
                    <span>{list.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {list.member_count} {list.member_count === 1 ? 'member' : 'members'}
                    </Badge>
                  </Label>
                  {list.description && (
                    <p className="text-sm text-muted-foreground mt-1">{list.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditingList(list);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDelete(list.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <CustomListDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingList(null);
        }}
        onSave={handleSaveList}
        list={editingList}
      />
    </div>
  );
};