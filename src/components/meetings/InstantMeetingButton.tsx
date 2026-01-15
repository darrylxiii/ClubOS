import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Video, Sparkles, Zap, Users, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useMeetingMessages } from '@/hooks/useMeetingMessages';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

interface InstantMeetingButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  iconOnly?: boolean;
  className?: string;
  showTemplates?: boolean;
  conversationId?: string;
}

export function InstantMeetingButton({
  variant = 'default',
  size = 'default',
  iconOnly = false,
  className,
  showTemplates = true,
  conversationId,
}: InstantMeetingButtonProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createMeetingMessage } = useMeetingMessages();
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [pmr, setPmr] = useState<any>(null);

  // Load templates and PMR on mount
  useEffect(() => {
    if (user && showTemplates) {
      loadTemplates();
      loadPMR();
    }
  }, [user, showTemplates]);

  const loadTemplates = async () => {
    const { data } = await supabase
      .from('meeting_templates')
      .select('*')
      .or(`user_id.eq.${user?.id},is_public.eq.true`)
      .order('usage_count', { ascending: false })
      .limit(5);
    
    if (data) setTemplates(data);
  };

  const loadPMR = async () => {
    const { data } = await supabase
      .from('personal_meeting_rooms')
      .select('*')
      .eq('user_id', user?.id)
      .eq('is_active', true)
      .single();
    
    if (data) setPmr(data);
  };

  const createInstantMeeting = async (templateId?: string, pmrCode?: string) => {
    if (!user) {
      toast.error('Please sign in to create a meeting');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-instant-meeting', {
        body: { templateId, pmrCode },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Meeting created! Redirecting...', {
          description: `Code: ${data.meeting.meeting_code}`,
        });

        // Send system message if in conversation
        if (conversationId && user) {
          await createMeetingMessage({
            conversationId,
            meetingId: data.meeting.id,
            systemMessageType: 'meeting_created',
            content: `Meeting created: ${data.meeting.title || 'Instant Meeting'}`,
            metadata: {
              meeting_code: data.meeting.meeting_code,
              meeting_url: `/meetings/${data.meeting.meeting_code}`,
              title: data.meeting.title || 'Instant Meeting'
            }
          });
        }
        
        // Redirect to meeting room
        setTimeout(() => {
          navigate(`/meetings/${data.meeting.meeting_code}`);
        }, 500);
      }
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      toast.error('Failed to create meeting', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (iconOnly) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => createInstantMeeting()}
        disabled={loading}
        className={className}
        title="Create instant meeting"
      >
        {loading ? (
          <Clock className="h-4 w-4 animate-spin" />
        ) : (
          <Video className="h-4 w-4" />
        )}
      </Button>
    );
  }

  if (!showTemplates || (templates.length === 0 && !pmr)) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => createInstantMeeting()}
        disabled={loading}
        className={className}
      >
        {loading ? (
          <>
            <Clock className="h-4 w-4 mr-2 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <Video className="h-4 w-4 mr-2" />
            <Sparkles className="h-3 w-3 mr-1 text-primary" />
            Create Meeting Now
          </>
        )}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={loading} className={className}>
          {loading ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Video className="h-4 w-4 mr-2" />
              <Sparkles className="h-3 w-3 mr-1 text-primary" />
              Create Meeting ▼
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
        
        <DropdownMenuItem onClick={() => createInstantMeeting()}>
          <Zap className="h-4 w-4 mr-2 text-primary" />
          Quick Meeting (1 hour)
        </DropdownMenuItem>

        {pmr && (
          <DropdownMenuItem onClick={() => createInstantMeeting(undefined, pmr.room_code)}>
            <Users className="h-4 w-4 mr-2 text-blue-500" />
            My Personal Room
          </DropdownMenuItem>
        )}

        {templates.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>From Template</DropdownMenuLabel>
            {templates.map((template) => (
              <DropdownMenuItem
                key={template.id}
                onClick={() => createInstantMeeting(template.id)}
              >
                <span className="mr-2">{template.icon || '📅'}</span>
                {template.name}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}