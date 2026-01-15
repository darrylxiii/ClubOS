import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Calendar, 
  UserPlus, 
  Bell, 
  MessageCircle, 
  Award, 
  Download, 
  ThumbsUp, 
  Users, 
  Shield,
  Mic,
  Video,
  Sparkles
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface ProfileActionButtonsProps {
  userId: string;
  isOwnProfile: boolean;
  onMessage: () => void;
  onRequestResume: () => void;
  onBookMeeting: (type: string) => void;
  onConnect: () => void;
  onFollow: () => void;
  onRequestVerification: () => void;
  onExport: (type: string) => void;
  onEndorse: () => void;
  onInviteToProject: () => void;
  onReport: () => void;
}

export function ProfileActionButtons({
  isOwnProfile,
  onMessage,
  onRequestResume,
  onBookMeeting,
  onConnect,
  onFollow,
  onRequestVerification,
  onExport,
  onEndorse,
  onInviteToProject,
  onReport,
}: ProfileActionButtonsProps) {
  if (isOwnProfile) return null;

  return (
    <div className="space-y-4">
      {/* Primary Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Button 
          onClick={onMessage}
          size="lg"
          className="gap-2 glass backdrop-blur-xl border-2 border-accent hover:shadow-glass-xl transition-all hover:scale-105"
        >
          <MessageCircle className="w-5 h-5" />
          Send Message
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              size="lg"
              className="gap-2 glass backdrop-blur-xl border-2 border-accent hover:shadow-glass-xl transition-all hover:scale-105"
            >
              <Calendar className="w-5 h-5" />
              Book a Meeting
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 glass backdrop-blur-xl border-accent/30">
            <DropdownMenuItem onClick={() => onBookMeeting('video')} className="gap-2 cursor-pointer">
              <Video className="w-4 h-4" />
              Schedule Video Call
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onBookMeeting('vr')} className="gap-2 cursor-pointer">
              <Sparkles className="w-4 h-4" />
              Meet in Club Lounge (VR)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onBookMeeting('advisory')} className="gap-2 cursor-pointer">
              <Users className="w-4 h-4" />
              Request 1-on-1 Advisory
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onBookMeeting('suggest')} className="gap-2 cursor-pointer">
              <Sparkles className="w-4 h-4 text-accent" />
              AI Suggest Best Time
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Secondary Actions Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Button 
          onClick={onRequestResume}
          variant="outline"
          className="gap-2 glass border-accent/30 hover:border-accent hover:shadow-glass transition-all"
        >
          <FileText className="w-4 h-4" />
          Request Resume
        </Button>

        <Button 
          onClick={onConnect}
          variant="outline"
          className="gap-2 glass border-accent/30 hover:border-accent hover:shadow-glass transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Connect
        </Button>

        <Button 
          onClick={onFollow}
          variant="outline"
          className="gap-2 glass border-accent/30 hover:border-accent hover:shadow-glass transition-all"
        >
          <Bell className="w-4 h-4" />
          Follow
        </Button>

        <Button 
          onClick={() => onMessage()}
          variant="outline"
          className="gap-2 glass border-accent/30 hover:border-accent hover:shadow-glass transition-all"
        >
          <Mic className="w-4 h-4" />
          Voice Note
        </Button>
      </div>

      {/* Secondary Actions Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Button 
          onClick={onEndorse}
          variant="outline"
          className="gap-2 glass border-accent/30 hover:border-accent hover:shadow-glass transition-all"
        >
          <ThumbsUp className="w-4 h-4" />
          Endorse
        </Button>

        <Button 
          onClick={onRequestVerification}
          variant="outline"
          className="gap-2 glass border-accent/30 hover:border-accent hover:shadow-glass transition-all"
        >
          <Award className="w-4 h-4" />
          Verify
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline"
              className="gap-2 glass border-accent/30 hover:border-accent hover:shadow-glass transition-all"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 glass backdrop-blur-xl border-accent/30">
            <DropdownMenuItem onClick={() => onExport('summary')} className="gap-2 cursor-pointer">
              <FileText className="w-4 h-4" />
              AI Career Summary
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('vcard')} className="gap-2 cursor-pointer">
              <Download className="w-4 h-4" />
              Quantum ID vCard
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button 
          onClick={onInviteToProject}
          variant="outline"
          className="gap-2 glass border-accent/30 hover:border-accent hover:shadow-glass transition-all"
        >
          <Users className="w-4 h-4" />
          Invite
        </Button>
      </div>

      {/* Privacy/Report */}
      <div className="flex justify-end">
        <Button 
          onClick={onReport}
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-destructive transition-colors"
        >
          <Shield className="w-4 h-4" />
          Report/Block
        </Button>
      </div>
    </div>
  );
}
