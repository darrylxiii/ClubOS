import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  Video, 
  Users, 
  Globe, 
  Lock, 
  MoreVertical,
  Copy,
  Edit,
  Trash,
  UserPlus
} from 'lucide-react';
import { InviteParticipantsDialog } from './InviteParticipantsDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface MeetingCardProps {
  meeting: any;
  onEdit?: (meeting: any) => void;
  onDelete?: (meetingId: string) => void;
}

export function MeetingCard({ meeting, onEdit, onDelete }: MeetingCardProps) {
  const navigate = useNavigate();
  const scheduledStart = new Date(meeting.scheduled_start);
  const scheduledEnd = new Date(meeting.scheduled_end);
  const isUpcoming = scheduledStart > new Date();
  const isInProgress = scheduledStart <= new Date() && scheduledEnd >= new Date();
  
  const handleCopyLink = () => {
    const meetingUrl = `${window.location.origin}/meetings/${meeting.meeting_code}`;
    navigator.clipboard.writeText(meetingUrl);
    toast.success('Meeting link copied to clipboard');
  };

  const handleJoin = () => {
    navigate(`/meetings/${meeting.meeting_code}`);
  };

  const getStatusBadge = () => {
    if (meeting.status === 'cancelled') {
      return <Badge variant="destructive">Cancelled</Badge>;
    }
    if (isInProgress) {
      return <Badge className="bg-green-500 animate-pulse">Live</Badge>;
    }
    if (isUpcoming) {
      return <Badge variant="secondary">Upcoming</Badge>;
    }
    return <Badge variant="outline">Past</Badge>;
  };

  const getAccessIcon = () => {
    switch (meeting.access_type) {
      case 'public':
        return <Globe className="h-4 w-4" />;
      case 'password':
        return <Lock className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-lg">{meeting.title}</h3>
            {getStatusBadge()}
          </div>
          {meeting.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {meeting.description}
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCopyLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </DropdownMenuItem>
            <InviteParticipantsDialog
              meetingId={meeting.id}
              meetingTitle={meeting.title}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Participants
                </DropdownMenuItem>
              }
            />
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(meeting)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem 
                onClick={() => onDelete(meeting.id)}
                className="text-destructive"
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {format(scheduledStart, 'MMM d, yyyy')}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {format(scheduledStart, 'h:mm a')} - {format(scheduledEnd, 'h:mm a')}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            {getAccessIcon()}
            {meeting.access_type === 'public' ? 'Public' : 
             meeting.access_type === 'password' ? 'Password Protected' : 
             'Invite Only'}
          </div>
          {meeting.allow_guests && (
            <Badge variant="outline" className="text-xs">
              Guests Allowed
            </Badge>
          )}
        </div>

        {meeting.agenda && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">Agenda:</p>
            <p className="text-sm line-clamp-2">{meeting.agenda}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t">
        {(isUpcoming || isInProgress) && (
          <Button onClick={handleJoin} className="flex-1 gap-2">
            <Video className="h-4 w-4" />
            {isInProgress ? 'Join Now' : 'Join Meeting'}
          </Button>
        )}
        {!isInProgress && (
          <Button variant="outline" onClick={handleCopyLink} className="gap-2">
            <Copy className="h-4 w-4" />
            Copy Link
          </Button>
        )}
      </div>
    </Card>
  );
}