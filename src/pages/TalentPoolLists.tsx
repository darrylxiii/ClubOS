import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  FolderOpen,
  Users,
  Sparkles,
  MoreVertical,
  Pencil,
  Trash2,
  Share2,
  Flame,
  TrendingUp,
  Clock,
  Medal,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTalentPoolLists, SMART_LIST_PRESETS } from '@/hooks/useTalentPoolLists';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const ICON_MAP: Record<string, React.ElementType> = {
  Flame,
  TrendingUp,
  Clock,
  Sparkles,
  Medal,
};

export default function TalentPoolLists() {
  const navigate = useNavigate();
  const { lists, isLoading, createList, updateList, deleteList, isCreating } = useTalentPoolLists();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState<string | null>(null);
  const [newList, setNewList] = useState({ name: '', description: '' });
  const [editingList, setEditingList] = useState({ name: '', description: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  const manualLists = lists.filter((l) => l.list_type === 'manual');
  const smartLists = lists.filter((l) => l.list_type === 'smart');

  const handleCreateList = async () => {
    if (!newList.name.trim()) return;
    await createList({ name: newList.name, description: newList.description });
    setNewList({ name: '', description: '' });
    setCreateDialogOpen(false);
  };

  const handleCreateSmartList = async (preset: (typeof SMART_LIST_PRESETS)[0]) => {
    await createList({
      name: preset.name,
      description: preset.description,
      list_type: 'smart',
      smart_criteria: preset.criteria,
    });
  };

  const handleDeleteList = async (listId: string) => {
    await deleteList(listId);
    setDeleteDialogOpen(null);
  };

  const handleEditList = async () => {
    if (!editDialogOpen || !editingList.name.trim()) return;
    setIsUpdating(true);
    try {
      await updateList({ 
        id: editDialogOpen, 
        name: editingList.name, 
        description: editingList.description 
      });
      setEditDialogOpen(null);
      setEditingList({ name: '', description: '' });
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditDialog = (list: typeof lists[0]) => {
    setEditingList({ name: list.name, description: list.description || '' });
    setEditDialogOpen(list.id);
  };

  const handleShareList = async () => {
    if (!shareDialogOpen) return;
    // Toggle share status
    const list = lists.find(l => l.id === shareDialogOpen);
    if (list) {
      await updateList({ id: shareDialogOpen, is_shared: !list.is_shared });
      toast.success(list.is_shared ? 'List is now private' : 'List is now shared with your team');
    }
    setShareDialogOpen(null);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Talent Lists</h1>
          <p className="text-muted-foreground">Organize candidates into curated lists</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New List
        </Button>
      </div>

      <Tabs defaultValue="my-lists" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-lists">My Lists ({manualLists.length})</TabsTrigger>
          <TabsTrigger value="smart-lists">Smart Lists ({smartLists.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="my-lists" className="space-y-4">
          {manualLists.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No lists yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first list to start organizing candidates
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create List
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {manualLists.map((list, index) => (
                <motion.div
                  key={list.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="cursor-pointer hover:border-primary/50 transition-colors group"
                    onClick={() => navigate(`/admin/talent-pool/lists/${list.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FolderOpen className="w-4 h-4 text-primary" />
                          </div>
                          <CardTitle className="text-base">{list.name}</CardTitle>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(list);
                              }}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setShareDialogOpen(list.id);
                              }}
                            >
                              <Share2 className="w-4 h-4 mr-2" />
                              {list.is_shared ? 'Unshare' : 'Share'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteDialogOpen(list.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {list.description && (
                        <CardDescription className="line-clamp-2">{list.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{list.member_count} candidates</span>
                        </div>
                        <span className="text-muted-foreground text-xs">
                          Updated {formatDistanceToNow(new Date(list.updated_at), { addSuffix: true })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="smart-lists" className="space-y-6">
          {/* Existing Smart Lists */}
          {smartLists.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {smartLists.map((list, index) => (
                <motion.div
                  key={list.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => navigate(`/admin/talent-pool/lists/${list.id}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-accent/10">
                          <Sparkles className="w-4 h-4 text-accent" />
                        </div>
                        <CardTitle className="text-base">{list.name}</CardTitle>
                      </div>
                      {list.description && (
                        <CardDescription>{list.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{list.member_count} candidates</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Smart List Templates */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Quick Create from Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SMART_LIST_PRESETS.map((preset) => {
                const Icon = ICON_MAP[preset.icon] || Sparkles;
                const alreadyExists = smartLists.some((l) => l.name === preset.name);

                return (
                  <Card
                    key={preset.name}
                    className={`border-dashed ${alreadyExists ? 'opacity-50' : 'hover:border-primary/50 cursor-pointer'} transition-colors`}
                    onClick={() => !alreadyExists && handleCreateSmartList(preset)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-muted">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{preset.name}</h4>
                          <p className="text-sm text-muted-foreground">{preset.description}</p>
                          {alreadyExists && (
                            <span className="text-xs text-muted-foreground mt-1 block">Already created</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create List Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
            <DialogDescription>Create a manual list to curate candidates</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Senior Engineers Q1"
                value={newList.name}
                onChange={(e) => setNewList((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="What's this list for?"
                value={newList.description}
                onChange={(e) => setNewList((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateList} disabled={!newList.name.trim() || isCreating}>
              Create List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialogOpen} onOpenChange={() => setDeleteDialogOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete List</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this list? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteDialogOpen && handleDeleteList(deleteDialogOpen)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit List Dialog */}
      <Dialog open={!!editDialogOpen} onOpenChange={() => setEditDialogOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit List</DialogTitle>
            <DialogDescription>Update the list name and description</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editingList.name}
                onChange={(e) => setEditingList((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editingList.description}
                onChange={(e) => setEditingList((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditList} disabled={!editingList.name.trim() || isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share List Dialog */}
      <Dialog open={!!shareDialogOpen} onOpenChange={() => setShareDialogOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share List</DialogTitle>
            <DialogDescription>
              {lists.find(l => l.id === shareDialogOpen)?.is_shared 
                ? 'This list is currently shared with your team. Would you like to make it private?'
                : 'Share this list with your team so they can view the candidates.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(null)}>
              Cancel
            </Button>
            <Button onClick={handleShareList}>
              {lists.find(l => l.id === shareDialogOpen)?.is_shared ? 'Make Private' : 'Share with Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
