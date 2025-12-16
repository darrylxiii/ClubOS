import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Key, Plus, Trash2, Copy, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

export function APIKeySettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState({ name: '', permissions: 'read' });
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  // Fetch API keys
  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ['workspace-api-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_api_keys' as any)
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as APIKey[];
    },
    enabled: !!user?.id,
  });

  // Generate API key
  const generateAPIKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'wsk_';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  // Create API key mutation
  const createKey = useMutation({
    mutationFn: async () => {
      const fullKey = generateAPIKey();
      const keyPrefix = fullKey.substring(0, 8);
      const keyHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(fullKey)
      ).then((hash) => 
        Array.from(new Uint8Array(hash))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
      );

      const { error } = await supabase
        .from('workspace_api_keys' as any)
        .insert({
          user_id: user?.id,
          name: newKey.name,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          permissions: newKey.permissions,
          is_active: true,
        });

      if (error) throw error;
      return fullKey;
    },
    onSuccess: (key) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-api-keys'] });
      setGeneratedKey(key);
      setNewKey({ name: '', permissions: 'read' });
      toast.success('API key created');
    },
    onError: (error) => {
      console.error('Failed to create API key:', error);
      toast.error('Failed to create API key');
    },
  });

  // Delete API key mutation
  const deleteKey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workspace_api_keys' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-api-keys'] });
      setDeleteKeyId(null);
      toast.success('API key revoked');
    },
  });

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleCreateClose = () => {
    setIsCreateOpen(false);
    setGeneratedKey(null);
    setShowKey(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage API keys for programmatic access to your databases
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={(open) => {
              if (!open) handleCreateClose();
              else setIsCreateOpen(true);
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                  <DialogDescription>
                    Generate a new API key for accessing your workspace data
                  </DialogDescription>
                </DialogHeader>

                {generatedKey ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <p className="text-sm font-medium text-yellow-500 mb-2">
                        Save this key now - you won't be able to see it again!
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          type={showKey ? 'text' : 'password'}
                          value={generatedKey}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowKey(!showKey)}
                        >
                          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(generatedKey)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Button className="w-full" onClick={handleCreateClose}>
                      Done
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="key-name">Key Name</Label>
                      <Input
                        id="key-name"
                        placeholder="e.g., Production API"
                        value={newKey.name}
                        onChange={(e) => setNewKey((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Permissions</Label>
                      <Select
                        value={newKey.permissions}
                        onValueChange={(value) => setNewKey((prev) => ({ ...prev, permissions: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="read">Read Only</SelectItem>
                          <SelectItem value="read-write">Read & Write</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={handleCreateClose}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => createKey.mutate()}
                        disabled={!newKey.name || createKey.isPending}
                      >
                        {createKey.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Generate Key
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No API keys created</p>
              <p className="text-sm">Create an API key to access your data programmatically</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{key.name}</span>
                        <Badge variant={key.permissions === 'read' ? 'secondary' : 'default'}>
                          {key.permissions === 'read' ? 'Read' : 'Read/Write'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="font-mono">{key.key_prefix}...</span>
                        <span>Created {format(new Date(key.created_at), 'MMM d, yyyy')}</span>
                        {key.last_used_at && (
                          <span>Last used {format(new Date(key.last_used_at), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteKeyId(key.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Any applications using this key will lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteKeyId && deleteKey.mutate(deleteKeyId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
