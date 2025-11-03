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
  Link2Icon
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

interface UnifiedCandidateCardProps {
  candidate: any;
  onEdit?: () => void;
  onSendInvitation?: () => void;
}

export function UnifiedCandidateCard({ 
  candidate, 
  onEdit, 
  onSendInvitation 
}: UnifiedCandidateCardProps) {
  const navigate = useNavigate();

  const getMergeStatusColor = (status: string) => {
    switch (status) {
      case 'merged':
        return 'default';
      case 'invited':
        return 'secondary';
      case 'unlinked':
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
            <AvatarImage src={candidate.display_avatar} />
            <AvatarFallback className="text-lg">
              {candidate.display_name?.substring(0, 2).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{candidate.display_name}</h3>
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
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate(`/candidates/${candidate.candidate_id}`)}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Full Profile
                  </DropdownMenuItem>
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <FileText className="w-4 h-4 mr-2" />
                      Edit Data
                    </DropdownMenuItem>
                  )}
                  {candidate.merge_status === 'unlinked' && onSendInvitation && (
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
              {candidate.display_email && (
                <div className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {candidate.display_email}
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
              <Badge variant={getMergeStatusColor(candidate.merge_status)}>
                <Link2Icon className="w-3 h-3 mr-1" />
                {candidate.merge_status}
              </Badge>
              
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
            {candidate.candidate_skills && candidate.candidate_skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {candidate.candidate_skills.slice(0, 5).map((skill: any, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {typeof skill === 'string' ? skill : skill.name}
                  </Badge>
                ))}
                {candidate.candidate_skills.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{candidate.candidate_skills.length - 5} more
                  </Badge>
                )}
              </div>
            )}

            {/* Completeness Score */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Data Completeness</span>
                <span className={`font-medium ${getCompletenessColor(candidate.data_completeness_score || 0)}`}>
                  {candidate.data_completeness_score || 0}%
                </span>
              </div>
              <Progress value={candidate.data_completeness_score || 0} className="h-2" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
