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
  MoreVertical,
  DollarSign,
  FileText,
  Link2Icon,
  Clock,
  Users,
  Briefcase as BriefcaseIcon,
  Pencil,
  History,
  Archive,
  Trash2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { getActivityColor, getActivityLabel, ActivityThresholds } from "./ActivitySettingsDialog";
import { DeleteCandidateDialog } from "./DeleteCandidateDialog";
import { MatchScoreInline } from "@/components/partner/MatchScoreInline";
import { UrgencyIndicators } from "@/components/partner/UrgencyIndicators";
import { CandidateActionBar } from "@/components/partner/CandidateActionBar";

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

  const activityColor = getActivityColor(candidate.last_interaction_date, activityThresholds);
  const activityLabel = getActivityLabel(candidate.last_interaction_date);

  const getActivityBgColor = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-100 text-green-700 border-green-200';
      case 'yellow': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'red': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
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

  const getCompletenessColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-50 bg-background border">
                  <DropdownMenuItem onClick={() => navigate(`/candidates/${candidate.id}`)}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Full Profile
                  </DropdownMenuItem>
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <FileText className="w-4 h-4 mr-2" />
                      Edit Data
                    </DropdownMenuItem>
                  )}
                  {['not_invited', 'pending'].includes(candidate.invitation_status) && onSendInvitation && (
                    <DropdownMenuItem onClick={onSendInvitation}>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Invitation
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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
            <div className="space-y-1 mt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Data Completeness</span>
                <span className={`font-medium ${getCompletenessColor(candidate.profile_completeness || 0)}`}>
                  {candidate.profile_completeness || 0}%
                </span>
              </div>
              <Progress value={candidate.profile_completeness || 0} className="h-2" />
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
    </Card>
  );
}
