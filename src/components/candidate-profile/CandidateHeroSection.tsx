import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Send, Calendar, Edit, Linkedin, User,
  AlertCircle, CheckCircle, Mail, Phone, MapPin,
  RefreshCw, Scan
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { candidateProfileTokens } from "@/config/candidate-profile-tokens";
import { ensureHttpsUrl } from "@/utils/urlHelpers";
import { useState } from "react";
import { EnrichmentProgressModal } from "./EnrichmentProgressModal";

interface Props {
  candidate: any;
  fromJob?: string;
  stage?: string;
  isAdmin?: boolean;
  onAdvance?: () => void;
  onDecline?: () => void;
  onMessage?: () => void;
  onSchedule?: () => void;
  onEdit?: () => void;
  onRefresh?: () => void;
}

export const CandidateHeroSection = ({
  candidate,
  fromJob,
  stage,
  isAdmin = false,
  onAdvance,
  onDecline,
  onMessage,
  onSchedule,
  onEdit,
  onRefresh,
}: Props) => {
  const navigate = useNavigate();
  const [enrichModal, setEnrichModal] = useState<{ open: boolean; mode: 'linkedin' | 'deep-enrich' }>({
    open: false,
    mode: 'linkedin',
  });

  const hasAccount = !!candidate.user_id;

  const candidateName = candidate.first_name && candidate.last_name
    ? `${candidate.first_name} ${candidate.last_name}`
    : candidate.full_name || candidate.email?.split('@')[0] || 'Unnamed Candidate';

  const initials = candidateName
    .split(' ')
    .map((n: string) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      <Card className={candidateProfileTokens.glass.card}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="w-32 h-32 border-2 border-border shadow-md">
              <AvatarImage src={candidate.avatar_url} alt={candidateName} />
              <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary/20 to-primary/10">
                {initials || <User className="h-12 w-12" />}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <h1 className="text-3xl font-bold mb-1">{candidateName}</h1>
                <p className="text-base text-muted-foreground">
                  {candidate.current_title}
                  {candidate.current_company && ` at ${candidate.current_company}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                {(candidate.email || candidate.contact_email) && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${candidate.email || candidate.contact_email}`} className="hover:text-foreground transition-colors">
                      {candidate.email || candidate.contact_email}
                    </a>
                  </div>
                )}
                {(candidate.phone || candidate.phone_number || candidate.contact_phone) && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${candidate.phone || candidate.phone_number || candidate.contact_phone}`} className="hover:text-foreground transition-colors">
                      {candidate.phone || candidate.phone_number || candidate.contact_phone}
                    </a>
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
                    <a href={ensureHttpsUrl(candidate.linkedin_url) || '#'} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="w-4 h-4 mr-1" />
                      LinkedIn
                    </a>
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
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
                {stage && (
                  <Badge className="bg-primary/10 border-primary/30 text-primary px-3 py-1">
                    📍 {stage}
                  </Badge>
                )}
                {candidate.years_of_experience && (
                  <Badge variant="outline">{candidate.years_of_experience} years exp</Badge>
                )}
                {candidate.notice_period && (
                  <Badge variant="outline">Notice: {candidate.notice_period}</Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {hasAccount ? (
                  <Button onClick={() => navigate(`/profile/${candidate.user_id}`)}>
                    <User className="w-4 h-4 mr-2" />
                    View Club Profile
                  </Button>
                ) : isAdmin ? (
                  <Button onClick={() => navigate(`/admin/invite?email=${encodeURIComponent(candidate.email || '')}&name=${encodeURIComponent(candidate.full_name || '')}`)}>
                    <Send className="w-4 h-4 mr-2" />
                    Send Invitation
                  </Button>
                ) : null}

                {onMessage && (
                  <Button variant="outline" size="sm" onClick={onMessage}>
                    <Send className="w-4 h-4 mr-2" />
                    Message
                  </Button>
                )}
                {onSchedule && (
                  <Button variant="outline" size="sm" onClick={onSchedule}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule
                  </Button>
                )}
                {onEdit && (
                  <Button variant="outline" size="sm" onClick={onEdit}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}

                {isAdmin && candidate.linkedin_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEnrichModal({ open: true, mode: 'linkedin' })}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync LinkedIn
                  </Button>
                )}

                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEnrichModal({ open: true, mode: 'deep-enrich' })}
                    className="border-primary/30 hover:border-primary/60"
                  >
                    <Scan className="w-4 h-4 mr-2" />
                    Deep Enrich
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <EnrichmentProgressModal
        open={enrichModal.open}
        onOpenChange={(open) => setEnrichModal(prev => ({ ...prev, open }))}
        mode={enrichModal.mode}
        candidateId={candidate.id}
        candidateData={candidate}
        onComplete={() => onRefresh?.()}
      />
    </>
  );
};
