import { useTranslation } from 'react-i18next';
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
  Sparkles,
  CheckCircle2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";

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
  const { t } = useTranslation('common');

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
          {t('profile.sendMessage')}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              size="lg"
              className="gap-2 glass backdrop-blur-xl border-2 border-accent hover:shadow-glass-xl transition-all hover:scale-105"
            >
              <Calendar className="w-5 h-5" />
              {t('profile.bookMeeting')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 glass backdrop-blur-xl border-accent/30">
            <DropdownMenuItem onClick={() => onBookMeeting('video')} className="gap-2 cursor-pointer">
              <Video className="w-4 h-4" />
              {t('profile.scheduleVideoCall')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onBookMeeting('vr')} className="gap-2 cursor-pointer">
              <Sparkles className="w-4 h-4" />
              {t('profile.meetClubLounge')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onBookMeeting('advisory')} className="gap-2 cursor-pointer">
              <Users className="w-4 h-4" />
              {t('profile.requestAdvisory')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onBookMeeting('suggest')} className="gap-2 cursor-pointer">
              <Sparkles className="w-4 h-4 text-accent" />
              {t('profile.aiSuggestBestTime')}
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
          {t('profile.requestResume')}
        </Button>

        <Button 
          onClick={onConnect}
          variant="outline"
          className="gap-2 glass border-accent/30 hover:border-accent hover:shadow-glass transition-all"
        >
          <UserPlus className="w-4 h-4" />
          {t('profile.connect')}
        </Button>

        <Button 
          onClick={onFollow}
          variant="outline"
          className="gap-2 glass border-accent/30 hover:border-accent hover:shadow-glass transition-all"
        >
          <Bell className="w-4 h-4" />
          {t('profile.follow')}
        </Button>

        <Button
          onClick={() => onMessage()}
          variant="outline"
          className="gap-2 glass border-accent/30 hover:border-accent hover:shadow-glass transition-all"
        >
          <Mic className="w-4 h-4" />
          {t('profile.voiceNote')}
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
          {t('profile.endorse')}
        </Button>

        <Button 
          onClick={onRequestVerification}
          variant="outline"
          className="gap-2 glass border-accent/30 hover:border-accent hover:shadow-glass transition-all"
        >
          <Award className="w-4 h-4" />
          {t('profile.verify')}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline"
              className="gap-2 glass border-accent/30 hover:border-accent hover:shadow-glass transition-all"
            >
              <Download className="w-4 h-4" />
              {t('common:actions.export')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 glass backdrop-blur-xl border-accent/30">
            <DropdownMenuItem onClick={() => onExport('summary')} className="gap-2 cursor-pointer">
              <FileText className="w-4 h-4" />
              {t('profile.aiCareerSummary')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('vcard')} className="gap-2 cursor-pointer">
              <Download className="w-4 h-4" />
              {t('profile.quantumIdVcard')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button 
          onClick={onInviteToProject}
          variant="outline"
          className="gap-2 glass border-accent/30 hover:border-accent hover:shadow-glass transition-all"
        >
          <Users className="w-4 h-4" />
          {t('profile.invite')}
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
          {t('profile.reportBlock')}
        </Button>
      </div>
    </div>
  );
}
