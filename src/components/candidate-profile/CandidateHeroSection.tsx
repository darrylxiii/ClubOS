import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Send, Calendar, Edit, TrendingUp, 
  Activity, Star, CheckCircle, Linkedin, User
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { candidateProfileTokens, getScoreColor } from "@/config/candidate-profile-tokens";

interface Props {
  candidate: any;
  fromJob?: string;
  onAdvance?: () => void;
  onDecline?: () => void;
  onMessage?: () => void;
  onSchedule?: () => void;
  onEdit?: () => void;
}

export const CandidateHeroSection = ({
  candidate,
  fromJob,
  onAdvance,
  onDecline,
  onMessage,
  onSchedule,
  onEdit,
}: Props) => {
  const navigate = useNavigate();
  
  const fitScore = candidate.fit_score || 0;
  const engagementScore = candidate.engagement_score || 0;
  const internalRating = candidate.internal_rating || 0;
  const completeness = candidate.profile_completeness || 0;

  // Get candidate name with fallback
  const candidateName = candidate.first_name && candidate.last_name 
    ? `${candidate.first_name} ${candidate.last_name}`
    : candidate.full_name || candidate.email?.split('@')[0] || 'Unnamed Candidate';
  
  // Get initials for avatar fallback
  const initials = candidateName
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const ScoreBadge = ({ label, value, max = 10, icon: Icon }: any) => {
    const percentage = (value / max) * 100;
    const color = getScoreColor(percentage);
    
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        className={`${candidateProfileTokens.glass.card} rounded-xl p-3 ${candidateProfileTokens.shadows.sm}`}
      >
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-3 h-3" style={{ color: color.bg }} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-2xl font-bold" style={{ color: color.bg }}>
          {max === 10 ? value.toFixed(1) : `${Math.round(percentage)}%`}
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`${candidateProfileTokens.glass.card} rounded-2xl overflow-hidden`}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {fromJob && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/jobs/${fromJob}/dashboard`)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Job
              </Button>
            )}
          </div>

          {/* Quick Actions Toolbar */}
          <div className="flex items-center gap-2">
            {onMessage && (
              <Button size="sm" variant="outline" onClick={onMessage}>
                <Send className="w-4 h-4 mr-2" />
                Message
              </Button>
            )}
            {onSchedule && (
              <Button size="sm" variant="outline" onClick={onSchedule}>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule
              </Button>
            )}
            {onEdit && (
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            {onAdvance && (
              <Button size="sm" onClick={onAdvance}>
                Advance
              </Button>
            )}
            {onDecline && (
              <Button size="sm" variant="outline" onClick={onDecline} className="border-red-500/50 text-red-500 hover:bg-red-500/10">
                Decline
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Hero Content */}
      <div className="p-8">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={candidateProfileTokens.animations.spring}
          >
            <Avatar className="w-32 h-32 border-4 border-background shadow-lg">
              <AvatarImage src={candidate.avatar_url} alt={candidateName} />
              <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary/20 to-primary/10">
                {initials || <User className="h-12 w-12" />}
              </AvatarFallback>
            </Avatar>
          </motion.div>

          {/* Info */}
          <div className="flex-1 space-y-4">
            <div>
              <motion.h1
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-4xl font-bold mb-2"
              >
                {candidateName}
              </motion.h1>
              <motion.p
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="text-lg text-muted-foreground mb-3"
              >
                {candidate.current_title} {candidate.current_company && `at ${candidate.current_company}`}
              </motion.p>
              
              {/* LinkedIn Badge */}
              {candidate.linkedin_url && (
                <motion.a
                  href={candidate.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 border border-[#0A66C2]/30 text-[#0A66C2] transition-all duration-200 hover:scale-105"
                >
                  <Linkedin className="w-4 h-4" />
                  <span className="text-sm font-medium">View LinkedIn Profile</span>
                </motion.a>
              )}
            </div>

            {/* Location & Details */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex flex-wrap gap-2"
            >
              {candidate.location && (
                <Badge variant="outline">{candidate.location}</Badge>
              )}
              {candidate.years_of_experience && (
                <Badge variant="outline">{candidate.years_of_experience} years exp</Badge>
              )}
              {candidate.notice_period && (
                <Badge variant="outline">Notice: {candidate.notice_period}</Badge>
              )}
            </motion.div>

            {/* Score Badges Row */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="grid grid-cols-4 gap-3"
            >
              <ScoreBadge label="Fit Score" value={fitScore} icon={TrendingUp} />
              <ScoreBadge label="Engagement" value={engagementScore} icon={Activity} />
              <ScoreBadge label="Rating" value={internalRating} icon={Star} />
              <ScoreBadge label="Complete" value={completeness} max={100} icon={CheckCircle} />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
