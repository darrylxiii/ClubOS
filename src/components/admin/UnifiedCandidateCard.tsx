import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Eye,
  DollarSign,
  FileText,
  Link2Icon,
  Clock,
  Users,
  Briefcase as BriefcaseIcon,
  Pencil,
  History,
  Archive,
  Trash2,
  UserPlus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CompletenessIndicator } from "@/components/candidates/CompletenessIndicator";
import { getActivityColor, getActivityLabel, ActivityThresholds } from "./ActivitySettingsDialog";
import { DeleteCandidateDialog } from "./DeleteCandidateDialog";
import { MatchScoreInline } from "@/components/partner/MatchScoreInline";
import { UrgencyIndicators } from "@/components/partner/UrgencyIndicators";
import { CandidateActionBar } from "@/components/partner/CandidateActionBar";
import { CandidateStrategistDialog } from "./CandidateStrategistDialog";

interface UnifiedCandidateCardProps {
  candidate: any;
  onEdit?: () => void;
  onSendInvitation?: () => void;
  onDelete?: () => void;
  activityThresholds: ActivityThresholds;
}

export function UnifiedCandidateCard({
  candidate,
  onEdit,
  onSendInvitation,
  onDelete,
  activityThresholds
}: UnifiedCandidateCardProps) {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft');
  const [strategistDialogOpen, setStrategistDialogOpen] = useState(false);

  const activityColor = getActivityColor(candidate.last_interaction_date, activityThresholds);
  const activityLabel = getActivityLabel(candidate.last_interaction_date);

  const getActivityBgColor = (color: string) => {
    switch (color) {
      case 'green': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'yellow': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'red': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getMergeStatusColor = (status: string) => {
    switch (status) {
      case 'registered':
        return 'default';
      case 'invited':
        return 'secondary';
      case 'not_invited':
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };



  return (
    <Card className="glass-card hover:shadow-glass-lg hover:-translate-y-1 transition-all duration-300 group">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="w-16 h-16">
            <AvatarImage src={candidate.avatar_url} />
            <AvatarFallback className="text-lg">
              {candidate.full_name?.substring(0, 2).toUpperCase() || candidate.email?.substring(0, 2).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{candidate.full_name || candidate.email}</h3>
                {candidate.current_title && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Briefcase className="w-3 h-3" />
                    {candidate.current_title}
                    {candidate.current_company && ` at ${candidate.current_company}`}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStrategistDialogOpen(true)}
                  className="h-8 text-xs"
                  title="Assign Strategist"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/candidate/${candidate.id}`)}
                  className="h-8 text-xs"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  View Profile
                </Button>
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onEdit}
                    className="h-8 text-xs"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                )}
                {['not_invited', 'pending'].includes(candidate.invitation_status) && onSendInvitation && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={onSendInvitation}
                    className="h-8 text-xs"
                  >
                    <Mail className="w-3.5 h-3.5 mr-1" />
                    Send Invitation
                  </Button>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
              {candidate.email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {candidate.email}
                </div>
              )}
              {candidate.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {candidate.phone}
                </div>
              )}
              {candidate.desired_locations?.[0] && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {candidate.desired_locations[0]}
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant={getMergeStatusColor(candidate.invitation_status)}>
                <Link2Icon className="w-3 h-3 mr-1" />
                {candidate.invitation_status === 'registered' ? 'Registered' :
                  candidate.invitation_status === 'invited' ? 'Invited' :
                    candidate.invitation_status === 'not_invited' ? 'Not Invited' : 'Pending'}
              </Badge>

              <Badge variant="outline" className={getActivityBgColor(activityColor)}>
                <Clock className="w-3 h-3 mr-1" />
                {activityLabel}
              </Badge>

              {candidate.profile_views !== undefined && (
                <Badge variant="outline">
                  <Eye className="w-3 h-3 mr-1" />
                  {candidate.profile_views} views
                </Badge>
              )}

              {candidate.total_applications !== undefined && candidate.total_applications > 0 && (
                <Badge variant="secondary">
                  <BriefcaseIcon className="w-3 h-3 mr-1" />
                  {candidate.total_applications} {candidate.total_applications === 1 ? 'application' : 'applications'}
                </Badge>
              )}

              {candidate.final_desired_salary_min && (
                <Badge variant="outline">
                  <DollarSign className="w-3 h-3 mr-1" />
                  {candidate.final_currency} {candidate.final_desired_salary_min.toLocaleString()}
                  {candidate.final_desired_salary_max &&
                    ` - ${candidate.final_desired_salary_max.toLocaleString()}`
                  }
                </Badge>
              )}

              {candidate.resume_url && (
                <Badge variant="outline">
                  <FileText className="w-3 h-3 mr-1" />
                  Resume
                </Badge>
              )}

              {candidate.years_of_experience && (
                <Badge variant="secondary">
                  {candidate.years_of_experience} yrs exp
                </Badge>
              )}
            </div>

            {/* Skills Preview */}
            {candidate.skills && candidate.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {candidate.skills.slice(0, 5).map((skill: any, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {typeof skill === 'string' ? skill : skill.name}
                  </Badge>
                ))}
                {candidate.skills.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{candidate.skills.length - 5} more
                  </Badge>
                )}
              </div>
            )}

            {/* Match Score & Urgency Indicators */}
            {(candidate.match_score || candidate.urgency_data) && (
              <div className="space-y-3 pt-3 border-t border-border/50">
                {candidate.match_score && (
                  <MatchScoreInline
                    matchScore={candidate.match_score}
                    jobId={candidate.job_id}
                    jobTitle={candidate.job_title}
                    company={candidate.company_name}
                    tags={candidate.job_tags || []}
                    skillsOverlap={candidate.skills_overlap}
                    experienceMatch={candidate.experience_match}
                    salaryFit={candidate.salary_fit}
                    locationFit={candidate.location_fit}
                    topFactors={candidate.top_match_factors}
                  />
                )}

                <UrgencyIndicators
                  hasPendingOffer={candidate.has_pending_offer}
                  noticeEndsInDays={candidate.notice_ends_in_days}
                  profileViews={candidate.profile_views}
                  daysInStage={candidate.days_in_stage}
                  avgDaysInStage={candidate.avg_days_in_stage || 7}
                />
              </div>
            )}

            {/* Completeness Score */}
            <div className="flex items-center gap-2 mt-3">
              <CompletenessIndicator score={candidate.profile_completeness || 0} size="md" showLabel />
              <span className="text-xs text-muted-foreground">Data Completeness</span>
            </div>

            {/* Quick Actions */}
            <div className="pt-3 mt-3 border-t border-border/50">
              <CandidateActionBar
                candidateId={candidate.id}
                candidateName={candidate.full_name || candidate.email}
                isShortlisted={candidate.is_shortlisted}
              />
            </div>
          </div>
        </div>
      </CardContent>

      {/* Delete Dialog */}
      <DeleteCandidateDialog
        candidate={candidate}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDeleted={() => {
          if (onDelete) onDelete();
        }}
        deleteType={deleteType}
      />

      {/* Strategist Assignment Dialog */}
      <CandidateStrategistDialog
        open={strategistDialogOpen}
        onOpenChange={setStrategistDialogOpen}
        candidate={{
          id: candidate.id,
          full_name: candidate.full_name,
          email: candidate.email,
          avatar_url: candidate.avatar_url,
          current_title: candidate.current_title,
          assigned_strategist_id: candidate.assigned_strategist_id,
        }}
      />
    </Card>
  );
}
