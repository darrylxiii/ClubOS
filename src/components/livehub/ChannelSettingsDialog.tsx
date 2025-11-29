import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Settings, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { setChannelPermissions, type UserRole, type ChannelPermissions } from '@/lib/permissions';

interface ChannelSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string | null;
}

interface Channel {
  id: string;
  name: string;
  description: string | null;
  channel_type: string;
  is_locked: boolean | null;
}

export function ChannelSettingsDialog({ open, onOpenChange, channelId }: ChannelSettingsDialogProps) {
  const { user } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // General settings
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  // Permissions per role
  const [permissions, setPermissions] = useState<Record<UserRole, ChannelPermissions>>({
    admin: {
      can_view: true,
      can_join: true,
      can_speak: true,
      can_video: true,
      can_screen_share: true,
      can_manage_messages: true,
    },
    moderator: {
      can_view: true,
      can_join: true,
      can_speak: true,
      can_video: true,
      can_screen_share: true,
      can_manage_messages: true,
    },
    user: {
      can_view: true,
      can_join: true,
      can_speak: true,
      can_video: true,
      can_screen_share: false,
      can_manage_messages: false,
    },
  });

  useEffect(() => {
    if (open && channelId) {
      loadChannel();
      loadPermissions();
    }
  }, [open, channelId]);

  const loadChannel = async () => {
    if (!channelId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('live_channels')
        .select('*')
        .eq('id', channelId)
        .single();

      if (error) throw error;

      setChannel(data);
      setName(data.name);
      setDescription(data.description || '');
      setIsLocked(data.is_locked || false);
    } catch (error) {
      console.error('Error loading channel:', error);
      toast.error('Failed to load channel');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissions = async () => {
    if (!channelId) return;

    try {
      const { data, error } = await supabase
        .from('live_channel_permissions')
        .select('*')
        .eq('channel_id', channelId);

      if (error) throw error;

      if (data && data.length > 0) {
        const permsMap: Record<string, ChannelPermissions> = {};
        data.forEach((perm) => {
          permsMap[perm.role] = {
            can_view: perm.can_view,
            can_join: perm.can_join,
            can_speak: perm.can_speak,
            can_video: perm.can_video,
            can_screen_share: perm.can_screen_share,
            can_manage_messages: perm.can_manage_messages,
          };
        });
        setPermissions({ ...permissions, ...permsMap });
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const handleSaveGeneral = async () => {
    if (!channelId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('live_channels')
        .update({
          name,
          description: description || null,
          is_locked: isLocked,
        })
        .eq('id', channelId);

      if (error) throw error;

      toast.success('Channel updated successfully');
    } catch (error) {
      console.error('Error updating channel:', error);
      toast.error('Failed to update channel');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!channelId) return;

    setSaving(true);
    try {
      for (const [role, perms] of Object.entries(permissions)) {
        await setChannelPermissions(channelId, role as UserRole, perms);
      }

      toast.success('Permissions updated successfully');
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChannel = async () => {
    if (!channelId || !confirm('Are you sure you want to delete this channel?')) return;

    try {
      const { error } = await supabase
        .from('live_channels')
        .delete()
        .eq('id', channelId);

      if (error) throw error;

      toast.success('Channel deleted successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting channel:', error);
      toast.error('Failed to delete channel');
    }
  };

  const updatePermission = (role: UserRole, permission: keyof ChannelPermissions, value: boolean) => {
    setPermissions({
      ...permissions,
      [role]: {
        ...permissions[role],
        [permission]: value,
      },
    });
  };

  if (!channelId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Channel Settings
          </DialogTitle>
          <DialogDescription>
            Manage channel configuration and permissions
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="danger">Danger Zone</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="channel-name">Channel Name</Label>
                <Input
                  id="channel-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="general"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel-description">Description</Label>
                <Textarea
                  id="channel-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Channel description..."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Locked Channel</Label>
                  <p className="text-sm text-muted-foreground">
                    Prevent members from sending messages
                  </p>
                </div>
                <Switch checked={isLocked} onCheckedChange={setIsLocked} />
              </div>

              <Separator />

              <div className="flex items-center gap-2">
                <Badge variant="secondary">{channel?.channel_type}</Badge>
              </div>

              <Button onClick={handleSaveGeneral} disabled={saving} className="w-full">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4">
              {(['admin', 'moderator', 'user'] as UserRole[]).map((role) => (
                <div key={role} className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <h4 className="font-medium capitalize">{role}</h4>
                  </div>

                  <div className="space-y-2 ml-6">
                    {Object.entries(permissions[role]).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className="text-sm font-normal capitalize">
                          {key.replace('can_', '').replace(/_/g, ' ')}
                        </Label>
                        <Switch
                          checked={value}
                          onCheckedChange={(checked) =>
                            updatePermission(role, key as keyof ChannelPermissions, checked)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <Button onClick={handleSavePermissions} disabled={saving} className="w-full">
                {saving ? 'Saving...' : 'Save Permissions'}
              </Button>
            </TabsContent>

            <TabsContent value="danger" className="space-y-4">
              <div className="p-4 border border-destructive rounded-lg space-y-3">
                <h4 className="font-medium text-destructive">Delete Channel</h4>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone. All messages and data will be permanently deleted.
                </p>
                <Button
                  variant="outline"
                  onClick={handleDeleteChannel}
                  className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Channel Permanently
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
