import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Trash2, LogOut, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useWorkspace, useWorkspaces } from '@/hooks/useWorkspaces';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';
import { WorkspaceMembersList } from './WorkspaceMembersList';
import { InviteMembersDialog } from './InviteMembersDialog';
import { EmojiPicker } from './EmojiPicker';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { toast } from 'sonner';

interface WorkspaceSettingsProps {
  workspaceId: string;
}

export function WorkspaceSettings({ workspaceId }: WorkspaceSettingsProps) {
  const navigate = useNavigate();
  const { data: workspace, isLoading } = useWorkspace(workspaceId);
  const { updateWorkspace, deleteWorkspace, leaveWorkspace } = useWorkspaces();
  const { isOwner, members } = useWorkspaceMembers(workspaceId);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when workspace loads
  useState(() => {
    if (workspace) {
      setName(workspace.name);
      setDescription(workspace.description || '');
      setEmoji(workspace.icon_emoji || '📁');
    }
  });

  const handleSave = async () => {
    if (!workspace) return;

    try {
      await updateWorkspace.mutateAsync({
        id: workspaceId,
        updates: {
          name: name.trim() || workspace.name,
          description: description.trim() || null,
          icon_emoji: emoji,
        },
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to update workspace:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteWorkspace.mutateAsync(workspaceId);
      navigate('/pages');
    } catch (error) {
      console.error('Failed to delete workspace:', error);
    }
  };

  const handleLeave = async () => {
    try {
      await leaveWorkspace.mutateAsync(workspaceId);
      navigate('/pages');
    } catch (error) {
      console.error('Failed to leave workspace:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Workspace not found</p>
      </div>
    );
  }

  const canEdit = isOwner || workspace.type !== 'company';

  return (
    <div className="space-y-6 max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold">Workspace Settings</h1>
          <p className="text-muted-foreground">{workspace.name}</p>
        </div>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            {canEdit ? 'Update your workspace details' : 'Workspace details (managed by company admins)'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => canEdit && setShowEmojiPicker(!showEmojiPicker)}
                disabled={!canEdit}
                className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 flex items-center justify-center text-3xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {emoji || workspace.icon_emoji || '📁'}
              </button>
              {showEmojiPicker && (
                <div className="absolute top-18 left-0 z-50">
                  <EmojiPicker
                    onSelect={(selected) => {
                      setEmoji(selected);
                      setShowEmojiPicker(false);
                      setHasChanges(true);
                    }}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name || workspace.name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setHasChanges(true);
                  }}
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description || workspace.description || ''}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setHasChanges(true);
                  }}
                  disabled={!canEdit}
                  rows={2}
                  placeholder="What's this workspace for?"
                />
              </div>
            </div>
          </div>

          {canEdit && hasChanges && (
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={updateWorkspace.isPending}>
                {updateWorkspace.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Members ({members.length})
            </CardTitle>
            <CardDescription>People with access to this workspace</CardDescription>
          </div>
          {(isOwner || workspace.type === 'team') && (
            <Button onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <WorkspaceMembersList workspaceId={workspaceId} />
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {workspace.type !== 'personal' && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions that affect the workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isOwner && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Leave Workspace</p>
                  <p className="text-sm text-muted-foreground">
                    You will lose access to all pages in this workspace
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      <LogOut className="h-4 w-4 mr-2" />
                      Leave
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Leave Workspace</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to leave "{workspace.name}"? You will lose access to all pages in this workspace.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleLeave}>
                        Leave Workspace
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {isOwner && workspace.type === 'team' && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Delete Workspace</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete this workspace and all its pages
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. All pages and data in "{workspace.name}" will be permanently deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete Workspace
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <InviteMembersDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        workspaceId={workspaceId}
        workspaceName={workspace.name}
      />
    </div>
  );
}
