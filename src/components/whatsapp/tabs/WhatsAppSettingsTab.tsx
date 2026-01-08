import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { notify } from '@/lib/notify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare, Shield, RefreshCw, ExternalLink, Copy, CheckCircle, 
  AlertCircle, Key, Globe, Loader2, Users, Wifi, WifiOff, Clock,
  ShieldCheck, Activity
} from 'lucide-react';

interface WhatsAppAccount {
  id: string;
  phone_number_id: string;
  business_account_id: string;
  display_phone_number: string;
  verified_name?: string;
  quality_rating?: string;
  is_active?: boolean;
  is_primary?: boolean;
  verification_status?: string;
  last_verified_at?: string;
  account_label?: string;
}

export function WhatsAppSettingsTab() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Fetch all accounts
  const { data: accounts, isLoading: accountsLoading, refetch: refetchAccounts } = useQuery({
    queryKey: ['whatsapp-accounts-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_business_accounts')
        .select('*')
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as WhatsAppAccount[];
    },
  });

  // Primary account
  const primaryAccount = accounts?.find(a => a.is_primary) || accounts?.[0];

  // Templates
  const { data: templates } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => {
      const { data } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('template_name');
      return data || [];
    },
  });

  // Activate account mutation
  const activateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-whatsapp-account', {
        body: { action: 'activate' }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Activation failed');
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts-settings'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account-status'] });
      notify.success(`Connected: ${data.account?.display_phone_number || 'WhatsApp Business'}`);
    },
    onError: (error: Error) => {
      notify.error(error.message);
    },
  });

  // Verify account mutation
  const verifyMutation = useMutation({
    mutationFn: async (accountId: string) => {
      setVerifyingId(accountId);
      const { data, error } = await supabase.functions.invoke('manage-whatsapp-account', {
        body: { action: 'verify', account_id: accountId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts-settings'] });
      if (data.verified) {
        notify.success('Connection verified successfully');
      } else {
        notify.warning(data.error || 'Verification failed');
      }
    },
    onError: (error: Error) => {
      notify.error(error.message);
    },
    onSettled: () => {
      setVerifyingId(null);
    },
  });

  const syncTemplates = async () => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-whatsapp-templates');
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      notify.success('Templates synced');
    } catch {
      notify.error('Failed to sync templates');
    } finally {
      setIsSyncing(false);
    }
  };

  const copyWebhookUrl = () => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook-receiver`;
    navigator.clipboard.writeText(url);
    notify.success('Webhook URL copied');
  };

  const isConnected = accounts && accounts.length > 0 && accounts.some(a => a.is_active);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'verified': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'failed': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    }
  };

  const getQualityColor = (rating?: string) => {
    switch (rating) {
      case 'GREEN': return 'text-green-500';
      case 'YELLOW': return 'text-amber-500';
      case 'RED': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">WhatsApp Settings</h2>
          <p className="text-sm text-muted-foreground">Manage your WhatsApp Business integration</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${
          isConnected 
            ? 'bg-green-500/10 text-green-600 border-green-500/20' 
            : 'bg-muted text-muted-foreground border-border'
        }`}>
          {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {isConnected ? 'Connected' : 'Not Connected'}
        </div>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts" className="gap-2">
            <Users className="w-4 h-4" />
            Accounts
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="webhook" className="gap-2">
            <Globe className="w-4 h-4" />
            Webhook
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Key className="w-4 h-4" />
            API
          </TabsTrigger>
        </TabsList>

        {/* ACCOUNTS TAB */}
        <TabsContent value="accounts" className="space-y-4">
          {/* Activation Card - Only show if no accounts */}
          {(!accounts || accounts.length === 0) && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Activate WhatsApp Business
                </CardTitle>
                <CardDescription>
                  Connect your WhatsApp Business API to start messaging candidates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => activateMutation.mutate()} 
                  disabled={activateMutation.isPending}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {activateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Wifi className="h-4 w-4 mr-2" />
                      Connect WhatsApp
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Requires WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_BUSINESS_ACCOUNT_ID in backend secrets
                </p>
              </CardContent>
            </Card>
          )}

          {/* Connected Accounts */}
          {accountsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : accounts && accounts.length > 0 ? (
            <div className="space-y-3">
              {accounts.map((account) => (
                <Card key={account.id} className={account.is_primary ? 'border-primary/30' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${account.is_active ? 'bg-green-500/10' : 'bg-muted'}`}>
                          <MessageSquare className={`h-5 w-5 ${account.is_active ? 'text-green-500' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{account.display_phone_number}</span>
                            {account.is_primary && (
                              <Badge variant="secondary" className="text-xs">Primary</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {account.verified_name || account.account_label || 'WhatsApp Business'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Quality Rating */}
                        {account.quality_rating && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <Activity className={`w-4 h-4 ${getQualityColor(account.quality_rating)}`} />
                            <span className={getQualityColor(account.quality_rating)}>{account.quality_rating}</span>
                          </div>
                        )}

                        {/* Status Badge */}
                        <Badge variant="outline" className={getStatusColor(account.verification_status)}>
                          {account.verification_status === 'verified' && <ShieldCheck className="w-3 h-3 mr-1" />}
                          {account.verification_status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
                          {account.verification_status || 'Pending'}
                        </Badge>

                        {/* Verify Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => verifyMutation.mutate(account.id)}
                          disabled={verifyingId === account.id}
                        >
                          {verifyingId === account.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Last verified info */}
                    {account.last_verified_at && (
                      <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Last verified: {new Date(account.last_verified_at).toLocaleString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* Re-activate button if accounts exist */}
              <Button 
                variant="outline" 
                onClick={() => activateMutation.mutate()} 
                disabled={activateMutation.isPending}
                className="w-full"
              >
                {activateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Connection from API Credentials
                  </>
                )}
              </Button>
            </div>
          ) : null}
        </TabsContent>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Message Templates</CardTitle>
                  <CardDescription>Pre-approved templates for outbound messaging</CardDescription>
                </div>
                <Button onClick={syncTemplates} disabled={isSyncing} variant="outline" size="sm">
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync Templates
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {templates?.map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{template.template_name}</p>
                      <p className="text-sm text-muted-foreground">{template.language_code} • {template.template_category}</p>
                    </div>
                    <Badge variant={template.approval_status === 'APPROVED' ? 'default' : 'secondary'}>
                      {template.approval_status}
                    </Badge>
                  </div>
                ))}
                {(!templates || templates.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">
                    No templates found. Click "Sync Templates" to fetch from WhatsApp.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WEBHOOK TAB */}
        <TabsContent value="webhook" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Webhook Configuration
              </CardTitle>
              <CardDescription>
                Configure these settings in Meta Business Suite
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Callback URL</Label>
                <div className="flex gap-2">
                  <Input 
                    value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook-receiver`}
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Verify Token</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Set WHATSAPP_WEBHOOK_VERIFY_TOKEN in backend secrets
                </p>
                <Input value="••••••••••••" disabled className="font-mono" />
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Required Webhook Fields</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <code className="bg-muted px-1 rounded">messages</code> - Incoming messages</li>
                  <li>• <code className="bg-muted px-1 rounded">message_deliveries</code> - Delivery status</li>
                  <li>• <code className="bg-muted px-1 rounded">message_reads</code> - Read receipts</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API TAB */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Configuration
              </CardTitle>
              <CardDescription>
                Your WhatsApp API credentials are stored securely in backend secrets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-600 dark:text-green-400">Secure Storage</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      API credentials are encrypted and stored as backend secrets. They are never exposed to the client.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>Access Token</Label>
                  <Input value="WHATSAPP_ACCESS_TOKEN (encrypted)" disabled className="font-mono text-muted-foreground" />
                </div>
                <div>
                  <Label>Phone Number ID</Label>
                  <Input value={primaryAccount?.phone_number_id || 'WHATSAPP_PHONE_NUMBER_ID'} disabled className="font-mono" />
                </div>
                <div>
                  <Label>Business Account ID</Label>
                  <Input value={primaryAccount?.business_account_id || 'WHATSAPP_BUSINESS_ACCOUNT_ID'} disabled className="font-mono" />
                </div>
              </div>

              <Button variant="outline" className="w-full" asChild>
                <a href="https://business.facebook.com/settings/whatsapp-business-accounts" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Meta Business Suite
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
