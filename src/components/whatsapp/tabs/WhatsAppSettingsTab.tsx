import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { notify } from '@/lib/notify';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Shield, RefreshCw, ExternalLink, Copy, CheckCircle, AlertCircle, Key, Globe } from 'lucide-react';

export function WhatsAppSettingsTab() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: account } = useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('whatsapp_business_accounts')
        .select('*')
        .limit(1)
        .single();
      return data;
    },
  });

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

  const syncTemplates = async () => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-whatsapp-templates');
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      notify.success('Templates synced successfully');
    } catch (error) {
      notify.error('Failed to sync templates');
    } finally {
      setIsSyncing(false);
    }
  };

  const copyWebhookUrl = () => {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook-receiver`;
    navigator.clipboard.writeText(url);
    notify.success('Webhook URL copied to clipboard');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold">WhatsApp Settings</h2>
        <p className="text-sm text-muted-foreground">Configure your WhatsApp Business integration</p>
      </div>

      <Tabs defaultValue="connection" className="space-y-4">
        <TabsList>
          <TabsTrigger value="connection">Connection</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="webhook">Webhook</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-500" />
                WhatsApp Business Account
              </CardTitle>
              <CardDescription>
                Connect your WhatsApp Business account to enable messaging
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {account ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Connected</p>
                        <p className="text-sm text-muted-foreground">{account.verified_name || 'WhatsApp Business'}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-500/10 text-green-500">Active</Badge>
                  </div>

                  <div className="grid gap-4">
                    <div>
                      <Label>Phone Number ID</Label>
                      <Input value={account.phone_number_id || '***'} disabled className="font-mono" />
                    </div>
                    <div>
                      <Label>Display Phone Number</Label>
                      <Input value={account.display_phone_number || 'Not set'} disabled />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                  <h3 className="font-medium mb-2">Not Connected</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your WhatsApp Business account to start messaging
                  </p>
                  <Button>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect WhatsApp
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
                <Label>Webhook URL</Label>
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
                  Set this in your environment as WHATSAPP_WEBHOOK_VERIFY_TOKEN
                </p>
                <Input value="••••••••••••" disabled className="font-mono" />
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Webhook Fields to Subscribe</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <code className="bg-muted px-1 rounded">messages</code> - Receive incoming messages</li>
                  <li>• <code className="bg-muted px-1 rounded">message_deliveries</code> - Delivery status updates</li>
                  <li>• <code className="bg-muted px-1 rounded">message_reads</code> - Read receipts</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Configuration
              </CardTitle>
              <CardDescription>
                Manage your WhatsApp API credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-600 dark:text-amber-400">Security Notice</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      API keys are stored securely as environment variables. Contact your administrator to update credentials.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label>WhatsApp Access Token</Label>
                  <Input value="••••••••••••••••••••" disabled className="font-mono" />
                </div>
                <div>
                  <Label>Phone Number ID</Label>
                  <Input value={account?.phone_number_id || '••••••••••••'} disabled className="font-mono" />
                </div>
                <div>
                  <Label>Business Account ID</Label>
                  <Input value={account?.business_account_id || '••••••••••••'} disabled className="font-mono" />
                </div>
              </div>

              <Button variant="outline" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Meta Business Suite
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
