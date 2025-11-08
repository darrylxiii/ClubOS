import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Mail, Phone, MoreVertical, Eye, FileText, Clock, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getActivityColor, getActivityLabel, ActivityThresholds } from "./ActivitySettingsDialog";

interface CandidatesTableProps {
  candidates: any[];
  selectedIds: string[];
  onSelectionChange: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  activityThresholds: ActivityThresholds;
}

export function CandidatesTable({
  candidates,
  selectedIds,
  onSelectionChange,
  onSelectAll,
  activityThresholds,
}: CandidatesTableProps) {
  const navigate = useNavigate();

  const getActivityBgColor = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-100 text-green-700 border-green-200';
      case 'yellow': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'red': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registered':
        return 'default';
      case 'invited':
        return 'secondary';
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
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedIds.length === candidates.length && candidates.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead>Candidate</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Activity</TableHead>
            <TableHead>Metrics</TableHead>
            <TableHead>Experience</TableHead>
            <TableHead>Completeness</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((candidate) => (
            <TableRow key={candidate.id}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(candidate.id)}
                  onCheckedChange={(checked) => onSelectionChange(candidate.id, checked as boolean)}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={candidate.avatar_url} />
                    <AvatarFallback>
                      {candidate.full_name?.substring(0, 2).toUpperCase() || 
                       candidate.email?.substring(0, 2).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{candidate.full_name || candidate.email}</div>
                    <div className="text-sm text-muted-foreground">{candidate.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1 text-sm">
                  {candidate.email && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      {candidate.email}
                    </div>
                  )}
                  {candidate.phone && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      {candidate.phone}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-[200px]">
                  <div className="font-medium truncate">{candidate.current_title || '—'}</div>
                  {candidate.current_company && (
                    <div className="text-sm text-muted-foreground truncate">
                      {candidate.current_company}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusColor(candidate.invitation_status)}>
                  {candidate.invitation_status === 'registered' ? 'Registered' : 
                   candidate.invitation_status === 'invited' ? 'Invited' : 
                   candidate.invitation_status === 'not_invited' ? 'Not Invited' : 'Pending'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={getActivityBgColor(getActivityColor(candidate.last_interaction_date, activityThresholds))}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {getActivityLabel(candidate.last_interaction_date)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {candidate.profile_views !== undefined && (
                    <div className="flex items-center gap-1 text-xs">
                      <Eye className="w-3 h-3" />
                      <span>{candidate.profile_views} views</span>
                    </div>
                  )}
                  {candidate.total_applications !== undefined && candidate.total_applications > 0 && (
                    <div className="flex items-center gap-1 text-xs">
                      <Briefcase className="w-3 h-3" />
                      <span>{candidate.total_applications} apps</span>
                    </div>
                  )}
                  {(!candidate.profile_views && !candidate.total_applications) && (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {candidate.years_of_experience ? (
                  <Badge variant="secondary">{candidate.years_of_experience} yrs</Badge>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>
                <div className="space-y-1 min-w-[100px]">
                  <div className="flex items-center justify-between text-sm">
                    <span className={`font-medium ${getCompletenessColor(candidate.profile_completeness || 0)}`}>
                      {candidate.profile_completeness || 0}%
                    </span>
                  </div>
                  <Progress value={candidate.profile_completeness || 0} className="h-1.5" />
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/candidates/${candidate.id}`)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <FileText className="w-4 h-4 mr-2" />
                      Edit Data
                    </DropdownMenuItem>
                    {['not_invited', 'pending'].includes(candidate.invitation_status) && (
                      <DropdownMenuItem>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Invitation
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
