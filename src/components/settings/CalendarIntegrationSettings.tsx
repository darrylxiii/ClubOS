import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, Check, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

const CALENDAR_PROVIDERS = [
  {
    id: 'google',
    name: 'Google Calendar',
    icon: '🗓️',
    description: 'Connect your Google Calendar for seamless interview scheduling',
    comingSoon: false,
  },
  {
    id: 'outlook',
    name: 'Microsoft Outlook',
    icon: '📅',
    description: 'Sync with your Outlook calendar',
    comingSoon: true,
  },
  {
    id: 'cal_com',
    name: 'Cal.com',
    icon: '📆',
    description: 'Use Cal.com for flexible scheduling',
    comingSoon: true,
  },
];

export function CalendarIntegrationSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [calendarProvider, setCalendarProvider] = useState<string | null>(null);
  const [calendarConnectedAt, setCalendarConnectedAt] = useState<string | null>(null);
  const [calendarSyncEnabled, setCalendarSyncEnabled] = useState(false);

  useEffect(() => {
    loadCalendarSettings();
  }, [user]);

  const loadCalendarSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setCalendarProvider((data as any).calendar_provider);
        setCalendarConnectedAt((data as any).calendar_connected_at);
        setCalendarSyncEnabled((data as any).calendar_sync_enabled || false);
      }
    } catch (error) {
      console.error('Error loading calendar settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (providerId: string) => {
    setConnecting(providerId);

    try {
      if (providerId === 'google') {
        // Initiate Google OAuth flow
        toast.info('Opening Google Calendar authorization...');
        
        // This would typically redirect to Google OAuth
        // For now, we'll simulate the connection
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const { error } = await supabase
          .from('profiles')
          .update({
            calendar_provider: providerId,
            calendar_connected_at: new Date().toISOString(),
            calendar_sync_enabled: true,
          } as any)
          .eq('id', user?.id!);

        if (error) throw error;

        setCalendarProvider(providerId);
        setCalendarConnectedAt(new Date().toISOString());
        setCalendarSyncEnabled(true);

        toast.success('Google Calendar connected successfully!');
      } else {
        toast.info('This calendar provider is coming soon!');
      }
    } catch (error) {
      console.error('Error connecting calendar:', error);
      toast.error('Failed to connect calendar');
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { error} = await supabase
        .from('profiles')
        .update({
          calendar_provider: null,
          calendar_access_token: null,
          calendar_refresh_token: null,
          calendar_token_expires_at: null,
          calendar_connected_at: null,
          calendar_sync_enabled: false,
        } as any)
        .eq('id', user?.id!);

      if (error) throw error;

      setCalendarProvider(null);
      setCalendarConnectedAt(null);
      setCalendarSyncEnabled(false);

      toast.success('Calendar disconnected');
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast.error('Failed to disconnect calendar');
    }
  };

  const handleSyncToggle = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ calendar_sync_enabled: enabled } as any)
        .eq('id', user?.id!);

      if (error) throw error;

      setCalendarSyncEnabled(enabled);
      toast.success(enabled ? 'Calendar sync enabled' : 'Calendar sync disabled');
    } catch (error) {
      console.error('Error updating sync setting:', error);
      toast.error('Failed to update sync setting');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendar Integration
          </CardTitle>
          <CardDescription>
            Connect your calendar to automatically schedule interviews and avoid conflicts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connected Calendar Status */}
          {calendarProvider && (
            <Alert>
              <Check className="w-4 h-4 text-green-500" />
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <span className="font-semibold">
                    {CALENDAR_PROVIDERS.find(p => p.id === calendarProvider)?.name || 'Calendar'}
                  </span>
                  {' '}connected
                  {calendarConnectedAt && (
                    <span className="text-muted-foreground text-sm ml-2">
                      • Connected {new Date(calendarConnectedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                >
                  Disconnect
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Sync Toggle */}
          {calendarProvider && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="calendar-sync" className="text-base">
                  Automatic Calendar Sync
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically check availability for interview scheduling
                </p>
              </div>
              <Switch
                id="calendar-sync"
                checked={calendarSyncEnabled}
                onCheckedChange={handleSyncToggle}
              />
            </div>
          )}

          {/* Calendar Providers */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Available Calendar Providers</Label>
            <div className="grid gap-3">
              {CALENDAR_PROVIDERS.map(provider => {
                const isConnected = calendarProvider === provider.id;
                const isConnecting = connecting === provider.id;

                return (
                  <div
                    key={provider.id}
                    className={`
                      p-4 border rounded-lg transition-all
                      ${isConnected ? 'border-primary bg-primary/5' : 'border-border'}
                    `}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-2xl">{provider.icon}</span>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{provider.name}</p>
                            {isConnected && (
                              <Badge variant="outline" className="gap-1">
                                <Check className="w-3 h-3" />
                                Connected
                              </Badge>
                            )}
                            {provider.comingSoon && (
                              <Badge variant="secondary">Coming Soon</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {provider.description}
                          </p>
                        </div>
                      </div>

                      {!isConnected && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConnect(provider.id)}
                          disabled={isConnecting || provider.comingSoon}
                          className="gap-2"
                        >
                          {isConnecting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-4 h-4" />
                              Connect
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info Alert */}
          {!calendarProvider && (
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <strong>Why connect your calendar?</strong><br />
                Connecting your calendar allows recruiters to see your availability and schedule interviews at times that work for you, eliminating back-and-forth emails.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
