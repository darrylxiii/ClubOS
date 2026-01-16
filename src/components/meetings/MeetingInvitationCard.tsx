import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Video, Calendar, Clock, Check, X as XIcon, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MeetingInvitationCardProps {
  invitation: {
    id: string;
    meeting_id: string;
    inviter_id: string;
    inviter_name?: string;
    inviter_avatar?: string;
    meeting_title: string;
    meeting_start_time: string;
    meeting_duration_minutes?: number;
    status: string;
    created_at: string;
  };
  onDismiss: () => void;
  onRespond: (response: 'accepted' | 'declined' | 'maybe') => void;
  hasConflict?: boolean;
}

export function MeetingInvitationCard({
  invitation,
  onDismiss,
  onRespond,
  hasConflict = false,
}: MeetingInvitationCardProps) {
  const [isResponding, setIsResponding] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const handleResponse = async (response: 'accepted' | 'declined' | 'maybe') => {
    setIsResponding(true);
    try {
      const { error } = await supabase
        .from('meeting_invitations')
        .update({ 
          status: response,
          responded_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      if (error) throw error;

      // Track analytics
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) {
        await supabase.from('meeting_notification_analytics').insert({
          meeting_invitation_id: invitation.id,
          notification_type: 'browser',
          responded_at: new Date().toISOString(),
          response_action: response,
          response_time_seconds: Math.floor(
            (new Date().getTime() - new Date(invitation.created_at).getTime()) / 1000
          ),
        } as any);
      }

      toast.success(
        response === 'accepted' 
          ? 'Meeting accepted! You can join now.' 
          : response === 'declined'
          ? 'Meeting declined.'
          : 'Marked as maybe.'
      );
      
      onRespond(response);
    } catch (error) {
      console.error('Error responding to invitation:', error);
      toast.error('Failed to respond to invitation');
    } finally {
      setIsResponding(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissing(true);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  const meetingDate = new Date(invitation.meeting_start_time);
  const timeUntil = formatDistanceToNow(meetingDate, { addSuffix: true });
  const formattedDate = format(meetingDate, 'MMM d, h:mm a');

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ 
        opacity: isDismissing ? 0 : 1, 
        y: isDismissing ? 50 : 0,
        scale: isDismissing ? 0.9 : 1
      }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative"
    >
      <div className="bg-card/20 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden max-w-md">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b border-border/30">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative">
                <div className="absolute -inset-1 bg-primary/20 rounded-full blur-sm" />
                <Avatar className="h-12 w-12 border-2 border-primary/30 relative">
                  <AvatarImage src={invitation.inviter_avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {invitation.inviter_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">Meeting Invitation</p>
                <p className="text-base font-semibold text-foreground truncate">
                  {invitation.inviter_name || 'Someone'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="h-8 w-8 rounded-full hover:bg-background/50"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Meeting Details */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Video className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-lg leading-tight">
                {invitation.meeting_title}
              </h3>
            </div>
          </div>

          <div className="space-y-2 pl-7">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{formattedDate}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {invitation.meeting_duration_minutes 
                  ? `${invitation.meeting_duration_minutes} minutes` 
                  : 'Duration not specified'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-medium">
                {timeUntil}
              </Badge>
              {hasConflict && (
                <Badge variant="destructive" className="text-xs">
                  Schedule Conflict
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 pt-0 flex gap-2">
          <Button
            onClick={() => handleResponse('accepted')}
            disabled={isResponding}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            size="lg"
          >
            <Check className="h-4 w-4 mr-2" />
            Accept
          </Button>
          
          <Button
            onClick={() => handleResponse('maybe')}
            disabled={isResponding}
            variant="outline"
            className="flex-1 border-border/50 hover:bg-accent/50"
            size="lg"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Maybe
          </Button>
          
          <Button
            onClick={() => handleResponse('declined')}
            disabled={isResponding}
            variant="outline"
            className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
            size="lg"
          >
            <XIcon className="h-4 w-4 mr-2" />
            Decline
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
