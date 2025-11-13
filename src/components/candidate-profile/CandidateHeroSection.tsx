import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Send, Calendar, Edit, Linkedin, User, 
  AlertCircle, CheckCircle, Mail, Phone, MapPin, MoreVertical
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { candidateProfileTokens } from "@/config/candidate-profile-tokens";

interface Props {
  candidate: any;
  fromJob?: string;
  stage?: string;
  onAdvance?: () => void;
  onDecline?: () => void;
  onMessage?: () => void;
  onSchedule?: () => void;
  onEdit?: () => void;
}

export const CandidateHeroSection = ({
  candidate,
  fromJob,
  stage,
  onAdvance,
  onDecline,
  onMessage,
  onSchedule,
  onEdit,
}: Props) => {
  const navigate = useNavigate();
  
  // Check account status
  const hasAccount = !!candidate.user_id;
  
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

  return (
    <Card className={candidateProfileTokens.glass.card}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar - Compact */}
          <Avatar className="w-32 h-32 border-2 border-border shadow-md">
            <AvatarImage src={candidate.avatar_url} alt={candidateName} />
            <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary/20 to-primary/10">
              {initials || <User className="h-12 w-12" />}
            </AvatarFallback>
          </Avatar>

          {/* Main Info Column */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Name + Title in one block */}
            <div>
              <h1 className="text-3xl font-bold mb-1">{candidateName}</h1>
              <p className="text-base text-muted-foreground">
                {candidate.current_title}
                {candidate.current_company && ` at ${candidate.current_company}`}
              </p>
            </div>

            {/* Contact Info Row - Compact horizontal layout */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {candidate.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  <span>{candidate.email}</span>
                </div>
              )}
              {candidate.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4" />
                  <span>{candidate.phone}</span>
                </div>
              )}
              {candidate.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>{candidate.location}</span>
                </div>
              )}
              {candidate.linkedin_url && (
                <Button variant="ghost" size="sm" asChild className="h-auto py-0 px-2">
                  <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="w-4 h-4 mr-1" />
                    LinkedIn
                  </a>
                </Button>
              )}
            </div>

            {/* Status Badges Row - Compact */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Account Status */}
              {!hasAccount ? (
                <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 bg-yellow-500/10">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Pending Setup
                </Badge>
              ) : (
                <Badge variant="outline" className="border-green-500/50 text-green-600 bg-green-500/10">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Active Member
                </Badge>
              )}

              {/* Current Stage - Only show if exists */}
              {stage && (
                <Badge className="bg-primary/10 border-primary/30 text-primary px-3 py-1">
                  📍 {stage}
                </Badge>
              )}

              {/* Years of Experience */}
              {candidate.years_of_experience && (
                <Badge variant="outline">{candidate.years_of_experience} years exp</Badge>
              )}

              {/* Notice Period */}
              {candidate.notice_period && (
                <Badge variant="outline">Notice: {candidate.notice_period}</Badge>
              )}
            </div>

            {/* Primary Actions - Compact */}
            <div className="flex items-center gap-2">
              {hasAccount ? (
                <Button onClick={() => navigate(`/profile/${candidate.user_id}`)}>
                  <User className="w-4 h-4 mr-2" />
                  View Club Profile
                </Button>
              ) : (
                <Button onClick={() => console.log('Send invitation')}>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invitation
                </Button>
              )}

              {/* Quick Actions in dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onMessage && (
                    <DropdownMenuItem onClick={onMessage}>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </DropdownMenuItem>
                  )}
                  {onSchedule && (
                    <DropdownMenuItem onClick={onSchedule}>
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Interview
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
