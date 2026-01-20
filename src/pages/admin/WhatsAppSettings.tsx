import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { notify } from '@/lib/notify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Settings, Shield, Zap, RefreshCw, ExternalLink, Copy, CheckCircle, AlertCircle } from 'lucide-react';

export default function WhatsAppSettings() {
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: accounts } = useQuery({
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
        .order('name');
      return data || [];
    },
  });

  const { data: automationRules } = useQuery({
    queryKey: ['whatsapp-automation-rules'],
    queryFn: async () => {
      const { data } = await supabase
        .from('whatsapp_automation_rules')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('whatsapp_automation_rules')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-automation-rules'] });
      notify.success('Rule updated');
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
    <AppLayout>
      <RoleGate allowedRoles={['admin']}>
        <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
          <div>
            <h1 className="text-2xl font-bold">WhatsApp Settings</h1>
            <p className="text-muted-foreground">Configure your WhatsApp Business integration</p>
          </div>

          <Tabs defaultValue="connection" className="space-y-4">
            <TabsList>
              <TabsTrigger value="connection">Connection</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="automation">Automation</TabsTrigger>
              <TabsTrigger value="webhook">Webhook</TabsTrigger>
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
                {accounts ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="font-medium">Connected</p>
                            <p className="text-sm text-muted-foreground">{accounts.verified_name || 'WhatsApp Business'}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-green-500/10 text-green-500">Active</Badge>
                      </div>

                      <div className="grid gap-4">
                        <div>
                          <Label>Phone Number ID</Label>
                          <Input value={accounts.phone_number_id || '***'} disabled className="font-mono" />
                        </div>
                        <div>
                          <Label>Display Phone Number</Label>
                          <Input value={accounts.display_phone_number || 'Not set'} disabled />
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
                          <p className="text-sm text-muted-foreground">{template.language_code}</p>
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

            <TabsContent value="automation" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Automation Rules
                  </CardTitle>
                  <CardDescription>
                    Automate responses and actions based on message triggers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {automationRules?.map((rule) => (
                      <div key={rule.id} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex-1">
                          <p className="font-medium">{rule.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Trigger: {rule.trigger_type} • Action: {rule.action_type}
                          </p>
                        </div>
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={(checked) => toggleRuleMutation.mutate({ id: rule.id, is_active: checked })}
                        />
                      </div>
                    ))}
                    {(!automationRules || automationRules.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">
                        No automation rules configured yet.
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
                    <Shield className="h-5 w-5" />
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
                      <li>• messages - Receive incoming messages</li>
                      <li>• message_deliveries - Delivery status updates</li>
                      <li>• message_reads - Read receipts</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}
