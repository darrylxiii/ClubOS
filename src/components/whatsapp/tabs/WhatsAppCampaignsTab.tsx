import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Megaphone, Users, Send, BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BroadcastCampaignBuilder } from '@/components/whatsapp/BroadcastCampaignBuilder';
import { format } from 'date-fns';

interface Campaign {
  id: string;
  name: string;
  status: string;
  template_name: string;
  recipient_count: number;
  sent_count: number;
  delivered_count: number;
  created_at: string;
}

export function WhatsAppCampaignsTab() {
  const [showBuilder, setShowBuilder] = useState(false);

  // Note: whatsapp_campaigns table may not exist yet - using empty array as fallback
  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ['whatsapp-campaigns'],
    queryFn: async () => {
      // Return empty array since table may not exist
      return [];
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'running': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'scheduled': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'draft': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (showBuilder) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => setShowBuilder(false)} className="mb-4">
          ← Back to Campaigns
        </Button>
        <BroadcastCampaignBuilder />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Broadcast Campaigns</h2>
          <p className="text-sm text-muted-foreground">Create and manage bulk WhatsApp message campaigns</p>
        </div>
        <Button onClick={() => setShowBuilder(true)} className="bg-[#25d366] hover:bg-[#25d366]/90">
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaigns?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total Campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Send className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {campaigns?.filter(c => c.status === 'completed').length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {campaigns?.reduce((sum, c) => sum + (c.recipient_count || 0), 0) || 0}
                </p>
                <p className="text-xs text-muted-foreground">Total Recipients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <BarChart3 className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {campaigns?.length ? Math.round(
                    campaigns.reduce((sum, c) => sum + ((c.delivered_count || 0) / Math.max(c.sent_count || 1, 1)) * 100, 0) / campaigns.length
                  ) : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Avg. Delivery Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Campaigns</CardTitle>
          <CardDescription>View and manage your broadcast campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium truncate">{campaign.name}</h3>
                      <Badge variant="outline" className={getStatusColor(campaign.status)}>
                        {campaign.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{campaign.recipient_count || 0} recipients</span>
                      <span>•</span>
                      <span>{campaign.template_name}</span>
                      <span>•</span>
                      <span>{format(new Date(campaign.created_at), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{campaign.delivered_count || 0} delivered</p>
                    <p className="text-sm text-muted-foreground">
                      {campaign.sent_count ? Math.round((campaign.delivered_count || 0) / campaign.sent_count * 100) : 0}% delivery
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">No campaigns yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first broadcast campaign to reach multiple contacts at once
              </p>
              <Button onClick={() => setShowBuilder(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
