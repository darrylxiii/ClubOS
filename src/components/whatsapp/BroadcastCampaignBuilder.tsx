import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/lib/notify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWhatsAppBroadcastConsent } from '@/hooks/useWhatsAppBroadcastConsent';
import { Plus, Send, Clock, CheckCircle, XCircle, Loader2, Shield, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface Campaign {
  id: string;
  name: string;
  template_id: string | null;
  status: string;
  scheduled_at: string | null;
  created_at: string;
}

export function BroadcastCampaignBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [recipientSource, setRecipientSource] = useState<'manual' | 'consented'>('consented');
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    template_name: '',
    segment_criteria: {} as Record<string, unknown>,
    recipient_phones: [] as string[],
  });

  const { allConsents, stats, getOptedInPhones, loading: loadingConsents } = useWhatsAppBroadcastConsent();

  const { data: campaigns } = useQuery({
    queryKey: ['whatsapp-campaigns'],
    queryFn: async () => {
      const { data } = await supabase
        .from('whatsapp_broadcast_campaigns')
        .select('id, name, template_id, status, scheduled_at, created_at')
        .order('created_at', { ascending: false });
      return (data || []) as Campaign[];
    },
  });

  const { data: templates } = useQuery({
    queryKey: ['whatsapp-templates-approved'],
    queryFn: async () => {
      const { data } = await supabase
        .from('whatsapp_templates')
        .select('id, template_name, language_code, approval_status')
        .eq('approval_status', 'APPROVED');
      return data || [];
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (campaign: typeof newCampaign) => {
      const { data: campaignData, error: campaignError } = await supabase
        .from('whatsapp_broadcast_campaigns')
        .insert({
          name: campaign.name,
          template_name: campaign.template_name,
          segment_criteria: campaign.segment_criteria,
          status: 'draft',
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Add recipients
      if (campaign.recipient_phones.length > 0) {
        const recipients = campaign.recipient_phones.map(phone => ({
          campaign_id: campaignData.id,
          phone_number: phone,
          status: 'pending' as const,
        }));

        const { error: recipientError } = await supabase
          .from('whatsapp_broadcast_recipients')
          .insert(recipients);

        if (recipientError) throw recipientError;
      }

      return campaignData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-campaigns'] });
      toast({ title: 'Campaign created' });
      setIsOpen(false);
      setNewCampaign({
        name: '',
        template_name: '',
        segment_criteria: {},
        recipient_phones: [],
      });
    },
    onError: () => {
      toast({ title: 'Failed to create campaign', variant: 'destructive' });
    },
  });

  const sendCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase.functions.invoke('send-whatsapp-broadcast', {
        body: { campaignId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-campaigns'] });
      toast({ title: 'Campaign sent successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to send campaign', variant: 'destructive' });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'sending':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'scheduled':
        return <Clock className="h-4 w-4 text-amber-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Broadcast Campaigns
          </CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Broadcast Campaign</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Campaign Name</Label>
                  <Input
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    placeholder="e.g., Q1 Job Opportunities"
                  />
                </div>

                <div>
                  <Label>Template</Label>
                  <Select
                    value={newCampaign.template_name}
                    onValueChange={(value) => setNewCampaign({ ...newCampaign, template_name: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select approved template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates?.map((template: { id: string; template_name: string }) => (
                        <SelectItem key={template.id} value={template.template_name}>
                          {template.template_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Recipients</Label>
                  <Tabs value={recipientSource} onValueChange={(v) => setRecipientSource(v as 'manual' | 'consented')}>
                    <TabsList className="w-full mb-3">
                      <TabsTrigger value="consented" className="flex-1 gap-1.5">
                        <Shield className="h-3.5 w-3.5" />
                        Consented ({stats.optedIn})
                      </TabsTrigger>
                      <TabsTrigger value="manual" className="flex-1">Manual</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="consented" className="mt-0">
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                          <Shield className="h-4 w-4" />
                          <span className="font-medium text-sm">GDPR Compliant</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Using {stats.optedIn} opted-in contacts. {stats.unknown > 0 && (
                            <span className="text-amber-500">({stats.unknown} with unknown consent excluded)</span>
                          )}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={async () => {
                            const phones = await getOptedInPhones();
                            setNewCampaign({ ...newCampaign, recipient_phones: phones });
                            toast({ title: `${phones.length} consented recipients loaded` });
                          }}
                          disabled={loadingConsents}
                        >
                          Load Consented Recipients
                        </Button>
                      </div>
                      {stats.optedOut > 0 && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          {stats.optedOut} opted-out contacts will be excluded
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="manual" className="mt-0">
                      <Textarea
                        placeholder="+31612345678&#10;+31698765432"
                        rows={4}
                        onChange={(e) => setNewCampaign({
                          ...newCampaign,
                          recipient_phones: e.target.value.split('\n').filter(p => p.trim()),
                        })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {newCampaign.recipient_phones.length} recipients (manual entry)
                      </p>
                      <p className="text-xs text-amber-500 mt-1">
                        ⚠️ Ensure you have consent for all manually entered numbers
                      </p>
                    </TabsContent>
                  </Tabs>
                </div>

                <Button
                  className="w-full"
                  onClick={() => createCampaignMutation.mutate(newCampaign)}
                  disabled={!newCampaign.name || !newCampaign.template_name || createCampaignMutation.isPending}
                >
                  Create Campaign
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {campaigns?.map((campaign) => (
            <div key={campaign.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {getStatusIcon(campaign.status)}
                  <p className="font-medium">{campaign.name}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Created: {format(new Date(campaign.created_at), 'MMM d, yyyy HH:mm')}
                </p>
              </div>
              <Badge variant={campaign.status === 'sent' ? 'default' : 'secondary'}>
                {campaign.status}
              </Badge>
              {campaign.status === 'draft' && (
                <Button
                  size="sm"
                  onClick={() => sendCampaignMutation.mutate(campaign.id)}
                  disabled={sendCampaignMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              )}
            </div>
          ))}
          {(!campaigns || campaigns.length === 0) && (
            <p className="text-center text-muted-foreground py-8">
              No campaigns yet. Create one to send bulk messages.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
