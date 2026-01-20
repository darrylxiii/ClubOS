import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Webhook, Trash2, TestTube, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface WebhookConfig {
  id: string;
  database_id: string;
  url: string;
  secret: string | null;
  events: string[];
  is_active: boolean;
  created_at: string;
  last_triggered_at: string | null;
}

interface WebhookSettingsProps {
  databaseId: string;
}

const WEBHOOK_EVENTS = [
  { value: 'row.created', label: 'Row Created' },
  { value: 'row.updated', label: 'Row Updated' },
  { value: 'row.deleted', label: 'Row Deleted' },
  { value: 'database.updated', label: 'Database Updated' },
];

export function WebhookSettings({ databaseId }: WebhookSettingsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    url: '',
    secret: '',
    events: [] as string[],
  });

  // Fetch webhooks for this database
  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ['workspace-webhooks', databaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_webhooks' as any)
        .select('*')
        .eq('database_id', databaseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as WebhookConfig[];
    },
    enabled: !!databaseId,
  });

  // Create webhook mutation
  const createWebhook = useMutation({
    mutationFn: async (webhook: typeof newWebhook) => {
      const { error } = await supabase
        .from('workspace_webhooks' as any)
        .insert({
          database_id: databaseId,
          user_id: user?.id,
          url: webhook.url,
          secret: webhook.secret || null,
          events: webhook.events,
          is_active: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-webhooks', databaseId] });
      setIsCreateOpen(false);
      setNewWebhook({ url: '', secret: '', events: [] });
      toast.success('Webhook created');
    },
    onError: (error) => {
      console.error('Failed to create webhook:', error);
      toast.error('Failed to create webhook');
    },
  });

  // Toggle webhook mutation
  const toggleWebhook = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('workspace_webhooks' as any)
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-webhooks', databaseId] });
    },
  });

  // Delete webhook mutation
  const deleteWebhook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('workspace_webhooks' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-webhooks', databaseId] });
      toast.success('Webhook deleted');
    },
  });

  // Test webhook mutation
  const testWebhook = useMutation({
    mutationFn: async (webhook: WebhookConfig) => {
      const { data, error } = await supabase.functions.invoke('workspace-webhook-dispatcher', {
        body: {
          webhookId: webhook.id,
          event: 'test',
          payload: {
            test: true,
            timestamp: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Test webhook sent');
    },
    onError: (error) => {
      console.error('Webhook test failed:', error);
      toast.error('Webhook test failed');
    },
  });

  const handleEventToggle = (event: string) => {
    setNewWebhook((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhooks
            </CardTitle>
            <CardDescription>
              Get notified when data changes in this database
            </CardDescription>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Webhook</DialogTitle>
                <DialogDescription>
                  Configure a webhook to receive notifications when data changes
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="webhook-url">Webhook URL</Label>
                  <Input
                    id="webhook-url"
                    placeholder="https://..."
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook((prev) => ({ ...prev, url: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="webhook-secret">Secret (optional)</Label>
                  <Input
                    id="webhook-secret"
                    placeholder="For signing payloads"
                    value={newWebhook.secret}
                    onChange={(e) => setNewWebhook((prev) => ({ ...prev, secret: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Used to sign webhook payloads for verification
                  </p>
                </div>
                <div>
                  <Label>Events</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {WEBHOOK_EVENTS.map((event) => (
                      <div
                        key={event.value}
                        className="flex items-center gap-2"
                      >
                        <Switch
                          checked={newWebhook.events.includes(event.value)}
                          onCheckedChange={() => handleEventToggle(event.value)}
                        />
                        <span className="text-sm">{event.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createWebhook.mutate(newWebhook)}
                    disabled={!newWebhook.url || newWebhook.events.length === 0 || createWebhook.isPending}
                  >
                    {createWebhook.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : webhooks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Webhook className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No webhooks configured</p>
            <p className="text-sm">Add a webhook to get notified of changes</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm truncate max-w-[200px]">
                        {webhook.url}
                      </span>
                      {webhook.is_active ? (
                        <Badge variant="default" className="bg-green-500/10 text-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {webhook.events.map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={webhook.is_active}
                      onCheckedChange={(checked) =>
                        toggleWebhook.mutate({ id: webhook.id, is_active: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => testWebhook.mutate(webhook)}
                      disabled={testWebhook.isPending}
                    >
                      {testWebhook.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteWebhook.mutate(webhook.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
