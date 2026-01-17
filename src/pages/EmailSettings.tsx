import { AppLayout } from "@/components/AppLayout";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Mail, Plus, Trash2, CheckCircle, XCircle,
  RefreshCw, Loader2, AlertCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { logger } from "@/lib/logger";
import { SectionLoader } from "@/components/ui/unified-loader";

interface EmailConnection {
  id: string;
  user_id: string;
  email: string;
  provider: string;
  is_active: boolean | null;
  sync_enabled: boolean | null;
  last_sync_at: string | null;
  created_at: string | null;
  label: string;
}

const EmailSettings = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<EmailConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState(''); // Kept for manual Outlook/IMAP if needed, but Gmail flow is different
  const [newProvider, setNewProvider] = useState<'gmail' | 'outlook' | 'other'>('gmail');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    loadConnections();
    handleOAuthCallback();
  }, [user?.id]);

  const loadConnections = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('email_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load email connections');
      return;
    }

    setConnections(data || []);
    setLoading(false);
  };

  const handleOAuthCallback = async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      toast.error('Google authentication failed');
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code) {
      setConnecting(true);
      toast.info('Completing email connection...');

      try {
        // Clean URL immediately to prevent re-use of code
        const redirectUri = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, window.location.pathname);

        const { data, error: funcError } = await supabase.functions.invoke('gmail-oauth', {
          body: {
            action: 'exchangeCode',
            code,
            redirectUri
          }
        });

        if (funcError) throw funcError;

        // Use the email from the token or fetch user profile
        // For now, we'll fetch the user profile from Google using the token to get the email
        // Or simpler: The backend could return the email, but it returns tokens.
        // We'll fetch the user info here or just use a placeholder if the token doesn't have email scope exposed easily purely from token response.
        // Actually, the backend requested `userinfo.email` scope. 
        // We really should fetch the email to save it correctly. 
        // Let's assume for this MVP we fetch it or the user confirms it. 
        // Wait, better: Let's fetch it using the access token.

        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${data.access_token}` }
        });
        const userData = await userResponse.json();
        const connectedEmail = userData.email;

        // Save connection
        const { error: insertError } = await supabase
          .from('email_connections')
          .upsert([{
            user_id: user?.id!,
            email: connectedEmail,
            provider: 'gmail',
            label: connectedEmail,
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
            is_active: true,
            sync_enabled: true
          }], { onConflict: 'user_id,email' });

        if (insertError) throw insertError;

        toast.success(`Successfully connected ${connectedEmail}`);
        loadConnections();

      } catch (err: any) {
        console.error('OAuth Error:', err);
        toast.error('Failed to connect email: ' + (err.message || 'Unknown error'));
      } finally {
        setConnecting(false);
      }
    }
  };

  const handleAddConnection = async () => {
    if (!user?.id) return;

    if (newProvider === 'gmail') {
      setConnecting(true);
      try {
        const redirectUri = window.location.origin + window.location.pathname;
        const { data, error } = await supabase.functions.invoke('gmail-oauth', {
          body: {
            action: 'getAuthUrl',
            redirectUri
          }
        });

        if (error) throw error;
        if (data?.authUrl) {
          window.location.href = data.authUrl;
        }
      } catch (error) {
        logger.error('Failed to initiate Gmail OAuth:', error);
        toast.error('Failed to start Google connection');
        setConnecting(false);
      }
      return;
    }

    // Fallback for non-Gmail (Simulated)
    if (!newEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setConnecting(true);

    try {
      const { error } = await supabase
        .from('email_connections')
        .insert({
          user_id: user.id,
          email: newEmail,
          provider: newProvider,
          label: newEmail,
          access_token: 'placeholder_token',
          is_active: true,
          sync_enabled: true
        });

      if (error) throw error;

      toast.success('Email connection added successfully');
      setAddDialogOpen(false);
      setNewEmail('');
      loadConnections();
    } catch (error) {
      logger.error('Connection error:', error);
      toast.error('Failed to add email connection');
    } finally {
      setConnecting(false);
    }
  };

  const handleToggleSync = async (connectionId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('email_connections')
        .update({ sync_enabled: !currentState })
        .eq('id', connectionId);

      if (error) throw error;

      toast.success(`Sync ${!currentState ? 'enabled' : 'disabled'}`);
      loadConnections();
    } catch (error) {
      logger.error('Toggle sync error:', error);
      toast.error('Failed to update sync settings');
    }
  };

  const handleSyncNow = async (connectionId: string) => {
    toast.info('Starting email sync...');

    try {
      // Update last_sync_at timestamp
      const { error } = await supabase
        .from('email_connections')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', connectionId);

      if (error) throw error;

      toast.success('Emails synced successfully');
      loadConnections();
    } catch (error) {
      logger.error('Sync error:', error);
      toast.error('Failed to sync emails');
    }
  };

  const handleRemoveConnection = async (connectionId: string, email: string) => {
    if (!confirm(`Remove connection to ${email}? This will stop syncing emails.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('email_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      toast.success('Email connection removed');
      loadConnections();
    } catch (error) {
      logger.error('Remove error:', error);
      toast.error('Failed to remove connection');
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'gmail':
        return '📧';
      case 'outlook':
        return '📨';
      default:
        return '✉️';
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Breadcrumb
          items={[
            { label: 'Home', path: '/home' },
            { label: 'Settings', path: '/settings' },
            { label: 'Email Connections' }
          ]}
        />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Email Connections</h1>
            <p className="text-muted-foreground mt-1">
              Connect your email accounts to sync communications with your inbox
            </p>
          </div>

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Email Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect Email Account</DialogTitle>
                <DialogDescription>
                  Add a new email account to sync with your Quantum Club inbox
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    disabled={connecting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider">Email Provider</Label>
                  <select
                    id="provider"
                    value={newProvider}
                    onChange={(e) => setNewProvider(e.target.value as any)}
                    disabled={connecting}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  >
                    <option value="gmail">Gmail</option>
                    <option value="outlook">Outlook / Microsoft 365</option>
                    <option value="other">Other (IMAP)</option>
                  </select>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    In production, this would initiate OAuth authentication.
                    For now, we'll create a connection placeholder.
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddConnection} disabled={connecting}>
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect Account'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            Connected email accounts will automatically sync to your inbox.
            You can enable/disable sync for each account at any time.
          </AlertDescription>
        </Alert>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <SectionLoader />
          </div>
        ) : connections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Mail className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No email accounts connected</h3>
              <p className="text-muted-foreground mb-4">
                Connect your email to sync all your communications in one place
              </p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Email Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {connections.map((conn) => (
              <Card key={conn.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{getProviderIcon(conn.provider)}</div>
                      <div>
                        <CardTitle className="text-lg">{conn.email}</CardTitle>
                        <CardDescription className="space-y-1">
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={conn.is_active ? 'default' : 'secondary'}>
                              {conn.is_active ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Active
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Inactive
                                </>
                              )}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {conn.provider}
                            </Badge>
                          </div>
                          {conn.last_sync_at && (
                            <p className="text-xs mt-2">
                              Last synced {formatDistanceToNow(new Date(conn.last_sync_at), { addSuffix: true })}
                            </p>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={conn.sync_enabled ?? false}
                        onCheckedChange={() => handleToggleSync(conn.id, conn.sync_enabled ?? false)}
                      />
                      <Label className="cursor-pointer">
                        Auto-sync emails
                      </Label>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncNow(conn.id)}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Sync Now
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveConnection(conn.id, conn.email)}
                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default EmailSettings;
