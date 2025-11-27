import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, QrCode, Share2, Settings, BarChart3, Users, Clock, Video, Link2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import QRCode from 'qrcode';

interface PersonalMeetingRoom {
  id: string;
  room_code: string;
  display_name: string;
  allow_guests: boolean;
  require_approval: boolean;
  total_meetings: number;
  is_active: boolean;
}

export default function PersonalMeetingRoom() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pmr, setPmr] = useState<PersonalMeetingRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [settings, setSettings] = useState({
    allow_guests: true,
    require_approval: false,
  });

  useEffect(() => {
    if (user) {
      loadPMR();
    }
  }, [user, loadPMR]);

  useEffect(() => {
    if (pmr) {
      generateQRCode();
    }
  }, [pmr, generateQRCode]);

  const loadPMR = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('personal_meeting_rooms')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setPmr(data);
        setCustomName(data.display_name);
        setSettings({
          allow_guests: data.allow_guests,
          require_approval: data.require_approval,
        });
      }
    } catch (error) {
      console.error('Error loading PMR:', error);
      toast.error('Failed to load personal meeting room');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const generateQRCode = useCallback(async () => {
    if (!pmr) return;
    try {
      const pmrUrl = `${window.location.origin}/join/${pmr.room_code}`;
      const qrCodeDataUrl = await QRCode.toDataURL(pmrUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCode(qrCodeDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }, [pmr]);

  const createPMR = async () => {

  const updatePMR = async () => {
    if (!pmr) return;

    try {
      const { error } = await supabase
        .from('personal_meeting_rooms')
        .update({
          display_name: customName,
          allow_guests: settings.allow_guests,
          require_approval: settings.require_approval,
        })
        .eq('id', pmr.id);

      if (error) throw error;
      toast.success('Settings updated');
      loadPMR();
    } catch (error: any) {
      console.error('Error updating PMR:', error);
      toast.error('Failed to update settings');
    }
  };

  const togglePMR = async () => {
    if (!pmr) return;

    try {
      const { error } = await supabase
        .from('personal_meeting_rooms')
        .update({ is_active: !pmr.is_active })
        .eq('id', pmr.id);

      if (error) throw error;
      toast.success(pmr.is_active ? 'PMR deactivated' : 'PMR activated');
      loadPMR();
    } catch (error: any) {
      console.error('Error toggling PMR:', error);
      toast.error('Failed to toggle PMR');
    }
  };

  const generateQRCode = async () => {
    if (!pmr) return;
    
    const url = `${window.location.origin}/meetings/${pmr.room_code}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/meetings/${pmr?.room_code}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(pmr?.room_code || '');
    toast.success('Code copied to clipboard');
  };

  const shareViaEmail = () => {
    const url = `${window.location.origin}/meetings/${pmr?.room_code}`;
    const subject = encodeURIComponent(`Join my personal meeting room`);
    const body = encodeURIComponent(`Join my personal meeting room:\n\n${url}\n\nMeeting Code: ${pmr?.room_code}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const startMeeting = async () => {
    if (!pmr) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('create-instant-meeting', {
        body: { pmrCode: pmr.room_code },
      });

      if (error) throw error;
      
      if (data?.success) {
        navigate(`/meetings/${data.meeting.meeting_code}`);
      }
    } catch (error: any) {
      console.error('Error starting meeting:', error);
      toast.error('Failed to start meeting');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!pmr) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6 max-w-2xl">
          <Card className="text-center py-12">
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Video className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                  <h2 className="text-2xl font-bold mb-2">Create Your Personal Meeting Room</h2>
                  <p className="text-muted-foreground">
                    Get a permanent meeting link that's always available
                  </p>
                </div>
              </div>

              <div className="space-y-4 max-w-md mx-auto text-left">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Room Name</Label>
                  <Input
                    id="display_name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="My Meeting Room"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="allow_guests">Allow Guests</Label>
                    <Switch
                      id="allow_guests"
                      checked={settings.allow_guests}
                      onCheckedChange={(checked) => setSettings({ ...settings, allow_guests: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="require_approval">Require Approval</Label>
                    <Switch
                      id="require_approval"
                      checked={settings.require_approval}
                      onCheckedChange={(checked) => setSettings({ ...settings, require_approval: checked })}
                    />
                  </div>
                </div>
              </div>

              <Button size="lg" onClick={createPMR}>
                <Video className="h-4 w-4 mr-2" />
                Create Personal Meeting Room
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const meetingUrl = `${window.location.origin}/meetings/${pmr.room_code}`;

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Personal Meeting Room</h1>
            <p className="text-muted-foreground mt-1">
              Your always-available meeting space
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={togglePMR}>
              {pmr.is_active ? 'Deactivate' : 'Activate'}
            </Button>
            <Button onClick={startMeeting}>
              <Video className="h-4 w-4 mr-2" />
              Start Meeting
            </Button>
          </div>
        </div>

        <Tabs defaultValue="share" className="space-y-4">
          <TabsList>
            <TabsTrigger value="share">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="share" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Meeting Code</CardTitle>
                  <CardDescription>Share this code with participants</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Meeting Code:</p>
                    <h2 className="text-4xl font-bold font-mono tracking-wider">
                      {pmr.room_code}
                    </h2>
                  </div>
                  <Button variant="outline" className="w-full" onClick={copyCode}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Meeting Link</CardTitle>
                  <CardDescription>Direct link to your room</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg break-all text-sm font-mono">
                    {meetingUrl}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={copyLink}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button variant="outline" onClick={shareViaEmail}>
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">QR Code</CardTitle>
                <CardDescription>Scan to join instantly</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                {qrCodeUrl && (
                  <div className="p-4 bg-white rounded-lg">
                    <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Room Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="room_name">Room Name</Label>
                  <Input
                    id="room_name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="guests">Allow Guests</Label>
                      <p className="text-sm text-muted-foreground">
                        Anyone with the link can join
                      </p>
                    </div>
                    <Switch
                      id="guests"
                      checked={settings.allow_guests}
                      onCheckedChange={(checked) => setSettings({ ...settings, allow_guests: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="approval">Require Approval</Label>
                      <p className="text-sm text-muted-foreground">
                        You must approve each participant
                      </p>
                    </div>
                    <Switch
                      id="approval"
                      checked={settings.require_approval}
                      onCheckedChange={(checked) => setSettings({ ...settings, require_approval: checked })}
                    />
                  </div>
                </div>

                <Button onClick={updatePMR}>
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Users className="h-4 w-4" />
                      <span className="text-sm">Total Meetings</span>
                    </div>
                    <p className="text-3xl font-bold">{pmr.total_meetings}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Link2 className="h-4 w-4" />
                      <span className="text-sm">Status</span>
                    </div>
                    <Badge variant={pmr.is_active ? 'default' : 'secondary'} className="text-lg">
                      {pmr.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">Average Duration</span>
                    </div>
                    <p className="text-3xl font-bold">45m</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
