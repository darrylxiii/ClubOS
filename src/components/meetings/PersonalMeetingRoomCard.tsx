import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Copy, Settings, Video, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface PersonalMeetingRoomCardProps {
  pmr: any;
  onUpdate?: () => void;
}

export function PersonalMeetingRoomCard({ pmr, onUpdate }: PersonalMeetingRoomCardProps) {
  const navigate = useNavigate();
  const [updating, setUpdating] = useState(false);

  const copyRoomLink = () => {
    const url = `${window.location.origin}/meetings/${pmr.room_code}`;
    navigator.clipboard.writeText(url);
    toast.success('Room link copied!');
  };

  const toggleActive = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('personal_meeting_rooms')
        .update({ is_active: !pmr.is_active })
        .eq('id', pmr.id);

      if (error) throw error;

      toast.success(pmr.is_active ? 'Room deactivated' : 'Room activated');
      onUpdate?.();
    } catch (error: any) {
      toast.error('Failed to update room');
    } finally {
      setUpdating(false);
    }
  };

  const startMeeting = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-instant-meeting', {
        body: { pmrCode: pmr.room_code },
      });

      if (error) throw error;

      toast.success('Starting your personal room...');
      navigate(`/meetings/${pmr.room_code}`);
    } catch (error: any) {
      toast.error('Failed to start meeting');
    }
  };

  return (
    <Card className="glass-subtle border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {pmr.display_name}
            </CardTitle>
            <CardDescription>{pmr.description || 'Your personal meeting space'}</CardDescription>
          </div>
          <Badge variant={pmr.is_active ? 'default' : 'secondary'}>
            {pmr.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <code className="text-sm font-mono flex-1">{pmr.room_code}</code>
          <Button variant="ghost" size="sm" onClick={copyRoomLink}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{pmr.total_meetings} meetings hosted</span>
          <span>{pmr.allow_guests ? 'Guests allowed' : 'Members only'}</span>
        </div>

        <div className="flex gap-2">
          <Button onClick={startMeeting} className="flex-1" disabled={!pmr.is_active}>
            <Video className="h-4 w-4 mr-2" />
            Start Meeting
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleActive}
            disabled={updating}
            title={pmr.is_active ? 'Deactivate room' : 'Activate room'}
          >
            {pmr.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}