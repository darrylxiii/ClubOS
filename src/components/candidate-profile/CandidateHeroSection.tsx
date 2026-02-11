import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Send, Calendar, Edit, Linkedin, User,
  AlertCircle, CheckCircle, Mail, Phone, MapPin,
  RefreshCw, Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { candidateProfileTokens } from "@/config/candidate-profile-tokens";
import { ensureHttpsUrl } from "@/utils/urlHelpers";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

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
  const [isSyncing, setIsSyncing] = useState(false);

  // Check account status
  const hasAccount = !!candidate.user_id;

  const handleSyncLinkedIn = async () => {
    if (!candidate.linkedin_url) {
      toast.error("No LinkedIn URL found for this candidate");
      return;
    }

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-scraper', {
        body: { linkedinUrl: candidate.linkedin_url }
      });

      if (error) throw error;

      if (data.success) {
        // Null-safe field-by-field update — never overwrite existing data with empty values
        const d = data.data;
        const updates: Record<string, unknown> = {};

        if (d.full_name) updates.full_name = d.full_name;
        if (d.current_title) updates.current_title = d.current_title;
        if (d.current_company) updates.current_company = d.current_company;
        if (d.avatar_url) updates.avatar_url = d.avatar_url;
        if (d.location) updates.location = d.location;
        if (d.years_of_experience) updates.years_of_experience = d.years_of_experience;
        if (d.work_history?.length) updates.work_history = d.work_history;
        if (d.education?.length) updates.education = d.education;
        if (d.ai_summary) updates.ai_summary = d.ai_summary;
        if (d.linkedin_profile_data) updates.linkedin_profile_data = d.linkedin_profile_data;

        // Merge skills (union, no duplicates)
        if (d.skills?.length) {
          const existing = Array.isArray(candidate.skills) ? candidate.skills : [];
          const merged = [...new Set([...existing, ...d.skills])];
          updates.skills = merged;
        }

        // Always update timestamps & enrichment metadata
        updates.enrichment_last_run = new Date().toISOString();
        updates.last_profile_update = new Date().toISOString();
        updates.enrichment_data = {
          source: 'linkedin',
          api_used: d.source_metadata?.api_used || 'unknown',
          enriched_at: new Date().toISOString(),
          fields_updated: Object.keys(updates),
        };

        const { error: updateError } = await supabase
          .from('candidate_profiles')
          .update(updates)
          .eq('id', candidate.id);

        if (updateError) throw updateError;

        // Trigger enrichment to recalculate completeness, AI summary, talent tier
        try {
          await supabase.functions.invoke('enrich-candidate-profile', {
            body: { candidateId: candidate.id }
          });
        } catch (enrichErr) {
          console.warn('[linkedin-sync] Post-sync enrichment failed (non-blocking):', enrichErr);
        }

        toast.success("LinkedIn profile synced successfully");
        onRefresh?.();
      } else {
        throw new Error(data.error || "Failed to sync LinkedIn profile");
      }
    } catch (error: unknown) {
      console.error("LinkedIn sync error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to sync LinkedIn profile");
    } finally {
      setIsSyncing(false);
    }
  };

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
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {/* Email - try multiple field names */}
              {(candidate.email || candidate.contact_email) && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a
                    href={`mailto:${candidate.email || candidate.contact_email}`}
                    className="hover:text-foreground transition-colors"
                  >
                    {candidate.email || candidate.contact_email}
                  </a>
                </div>
              )}
              {/* Phone - try multiple field names */}
              {(candidate.phone || candidate.phone_number || candidate.contact_phone) && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a
                    href={`tel:${candidate.phone || candidate.phone_number || candidate.contact_phone}`}
                    className="hover:text-foreground transition-colors"
                  >
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
              ) : isAdmin ? (
                <Button onClick={() => navigate(`/admin/invite?email=${encodeURIComponent(candidate.email || '')}&name=${encodeURIComponent(candidate.full_name || '')}`)}>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invitation
                </Button>
              ) : null}

              {/* Direct Action Buttons */}
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
                  onClick={handleSyncLinkedIn}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Sync LinkedIn
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
