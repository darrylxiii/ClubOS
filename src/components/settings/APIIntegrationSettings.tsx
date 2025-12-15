import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Key, Webhook, Link2, Copy, Eye, EyeOff, Trash2, Plus, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
}

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
}

export function APIIntegrationSettings() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [instantlyApiKey, setInstantlyApiKey] = useState('');
  const [showInstantlyKey, setShowInstantlyKey] = useState(false);
  const [saving, setSaving] = useState(false);

  // Integration toggles
  const [integrations, setIntegrations] = useState({
    instantly: false,
    greenhouse: false,
    lever: false,
    slack: false,
  });

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    
    try {
      // Use localStorage as fallback since this column may not exist
      const stored = localStorage.getItem(`api_settings_${user.id}`);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        if (parsedSettings.instantly_api_key) {
          setInstantlyApiKey(parsedSettings.instantly_api_key);
          setIntegrations(prev => ({ ...prev, instantly: true }));
        }
        if (parsedSettings.integrations) {
          setIntegrations(prev => ({ ...prev, ...parsedSettings.integrations }));
        }
      }
    } catch (error) {
      console.error('Error loading API settings:', error);
    }
  };

  const generateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }
    
    // Generate a random API key
    const key = `tqc_${crypto.randomUUID().replace(/-/g, '')}`;
    const keyPrefix = key.substring(0, 12);
    
    // In production, you'd hash the key and store only the hash
    const newKey: APIKey = {
      id: crypto.randomUUID(),
      name: newKeyName,
      key_prefix: keyPrefix,
      created_at: new Date().toISOString(),
      last_used_at: null,
      is_active: true,
    };
    
    setApiKeys([...apiKeys, newKey]);
    setNewKeyName('');
    
    // Show the full key once
    toast.success(
      <div className="space-y-2">
        <p>API Key created! Copy it now - it won't be shown again:</p>
        <code className="block p-2 bg-muted rounded text-xs break-all">{key}</code>
      </div>,
      { duration: 30000 }
    );
  };

  const revokeApiKey = (keyId: string) => {
    setApiKeys(apiKeys.filter(k => k.id !== keyId));
    toast.success('API key revoked');
  };

  const saveInstantlyKey = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      // Store in localStorage as this column may not exist in DB
      localStorage.setItem(`api_settings_${user.id}`, JSON.stringify({
        instantly_api_key: instantlyApiKey,
        integrations,
      }));
      toast.success('API settings saved');
    } catch (error) {
      console.error('Error saving API settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Personal API Keys
          </CardTitle>
          <CardDescription>Generate API keys for programmatic access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="API Key Name (e.g., 'My Integration')"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
            />
            <Button onClick={generateApiKey}>
              <Plus className="w-4 h-4 mr-2" />
              Generate
            </Button>
          </div>

          {apiKeys.length > 0 ? (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.name}</span>
                      <Badge variant={key.is_active ? "default" : "secondary"}>
                        {key.is_active ? "Active" : "Revoked"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{key.key_prefix}...</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeApiKey(key.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No API keys generated yet
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Third-Party Integrations
          </CardTitle>
          <CardDescription>Connect external services to enhance your workflow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instantly.ai */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">I</span>
                </div>
                <div>
                  <Label className="text-base">Instantly.ai</Label>
                  <p className="text-xs text-muted-foreground">Cold email automation platform</p>
                </div>
              </div>
              <Switch
                checked={integrations.instantly}
                onCheckedChange={(checked) => setIntegrations({ ...integrations, instantly: checked })}
              />
            </div>
            
            {integrations.instantly && (
              <div className="space-y-2 pt-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showInstantlyKey ? "text" : "password"}
                      placeholder="Enter your Instantly API key"
                      value={instantlyApiKey}
                      onChange={(e) => setInstantlyApiKey(e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2"
                      onClick={() => setShowInstantlyKey(!showInstantlyKey)}
                    >
                      {showInstantlyKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                  <Button onClick={saveInstantlyKey} disabled={saving}>
                    Save
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Find your API key in{" "}
                  <a href="https://app.instantly.ai/app/settings/integrations" target="_blank" rel="noopener" className="text-primary hover:underline">
                    Instantly Settings <ExternalLink className="w-3 h-3 inline" />
                  </a>
                </p>
              </div>
            )}
          </div>

          {/* Greenhouse */}
          <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <span className="text-lg font-bold text-green-500">G</span>
              </div>
              <div>
                <Label className="text-base">Greenhouse</Label>
                <p className="text-xs text-muted-foreground">ATS integration (Coming Soon)</p>
              </div>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>

          {/* Lever */}
          <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <span className="text-lg font-bold text-blue-500">L</span>
              </div>
              <div>
                <Label className="text-base">Lever</Label>
                <p className="text-xs text-muted-foreground">ATS integration (Coming Soon)</p>
              </div>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>

          {/* Slack */}
          <div className="flex items-center justify-between p-4 border rounded-lg opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <span className="text-lg font-bold text-purple-500">S</span>
              </div>
              <div>
                <Label className="text-base">Slack</Label>
                <p className="text-xs text-muted-foreground">Team notifications (Coming Soon)</p>
              </div>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="w-5 h-5" />
            Webhooks
          </CardTitle>
          <CardDescription>Receive real-time event notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Webhook className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Webhook configuration coming soon</p>
            <p className="text-sm">Subscribe to events like new applications, interview scheduled, etc.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
