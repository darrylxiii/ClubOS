import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Key, Plus, Copy, Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_hour: number;
  last_used_at: string | null;
  created_at: string;
  is_active: boolean;
}

export const APIKeyManager = () => {
  const { toast } = useToast();
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['read:jobs', 'read:applications']);
  const [rateLimit, setRateLimit] = useState(1000);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_keys' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKeys(data as any || []);
    } catch (error: any) {
      toast({
        title: 'Failed to Load API Keys',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    try {
      // Generate API key
      const { data: keyData, error: keyError } = await supabase.rpc('generate_api_key' as any);
      
      if (keyError) throw keyError;

      // Get user's company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: member } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!member) throw new Error('No company association found');

      // Store API key
      const { error: insertError } = await supabase
        .from('api_keys' as any)
        .insert({
          company_id: member.company_id,
          name: newKeyName,
          key_prefix: keyData[0].key_prefix,
          key_hash: keyData[0].key_hash,
          scopes: newKeyScopes,
          rate_limit_per_hour: rateLimit,
        });

      if (insertError) throw insertError;

      setGeneratedKey(keyData[0].full_key);
      setShowKey(true);
      
      toast({
        title: 'API Key Created',
        description: 'Save this key now - you won\'t be able to see it again!',
      });

      loadKeys();
    } catch (error: any) {
      toast({
        title: 'Failed to Create API Key',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCopyKey = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      toast({
        title: 'Copied',
        description: 'API key copied to clipboard',
      });
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('api_keys' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'API Key Deleted',
        description: 'The API key has been permanently deleted',
      });

      loadKeys();
    } catch (error: any) {
      toast({
        title: 'Failed to Delete API Key',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('api_keys' as any)
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: isActive ? 'API Key Disabled' : 'API Key Enabled',
        description: `The API key has been ${isActive ? 'disabled' : 'enabled'}`,
      });

      loadKeys();
    } catch (error: any) {
      toast({
        title: 'Failed to Update API Key',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setNewKeyName('');
    setNewKeyScopes(['read:jobs', 'read:applications']);
    setRateLimit(1000);
    setGeneratedKey(null);
    setShowKey(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              API Keys
            </CardTitle>
            <CardDescription>
              Manage API keys for programmatic access to your data
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                  Generate a new API key for programmatic access
                </DialogDescription>
              </DialogHeader>

              {generatedKey ? (
                <div className="space-y-4 py-4">
                  <div className="p-4 bg-muted rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Your API Key</Label>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowKey(!showKey)}
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <div className="font-mono text-sm break-all">
                      {showKey ? generatedKey : '•'.repeat(50)}
                    </div>
                    <Button onClick={handleCopyKey} className="w-full">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Key
                    </Button>
                  </div>
                  <p className="text-sm text-destructive font-medium">
                    ⚠️ Save this key now - you won't be able to see it again!
                  </p>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Key Name</Label>
                    <Input
                      placeholder="e.g., Production API Key"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Rate Limit (requests per hour)</Label>
                    <Select
                      value={rateLimit.toString()}
                      onValueChange={(v) => setRateLimit(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100">100 requests/hour</SelectItem>
                        <SelectItem value="1000">1,000 requests/hour</SelectItem>
                        <SelectItem value="5000">5,000 requests/hour</SelectItem>
                        <SelectItem value="10000">10,000 requests/hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <DialogFooter>
                {generatedKey ? (
                  <Button onClick={closeDialog}>Done</Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={closeDialog}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateKey} disabled={!newKeyName}>
                      Generate Key
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading API keys...</div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No API keys created yet. Click "Create API Key" to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{key.name}</h4>
                    <Badge variant={key.is_active ? 'default' : 'secondary'}>
                      {key.is_active ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    {key.key_prefix}...
                  </p>
                  <div className="text-xs text-muted-foreground">
                    {key.last_used_at
                      ? `Last used ${new Date(key.last_used_at).toLocaleDateString()}`
                      : 'Never used'}
                    {' • '}
                    {key.rate_limit_per_hour.toLocaleString()} req/hour
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(key.id, key.is_active)}
                  >
                    {key.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteKey(key.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
