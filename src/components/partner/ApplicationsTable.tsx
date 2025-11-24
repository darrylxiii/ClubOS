import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { 
  Eye, 
  MoreVertical, 
  UserCheck, 
  UserX, 
  MessageSquare,
  Calendar,
  ExternalLink,
  Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CandidateDetailDialog } from "./CandidateDetailDialog";
import { CandidateActionDialog } from "./CandidateActionDialog";
import { getVisibleFields } from "@/utils/candidateVisibility";
import { useUserRole } from "@/hooks/useUserRole";

interface ApplicationsTableProps {
  applications: any[];
  onUpdate: () => void;
}

export const ApplicationsTable = ({ applications, onUpdate }: ApplicationsTableProps) => {
  const navigate = useNavigate();
  const { role } = useUserRole();
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    application: any;
    action: 'advance' | 'reject' | null;
  }>({ open: false, application: null, action: null });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; className?: string }> = {
      active: { variant: "default", label: "Active", className: "bg-blue-500" },
      hired: { variant: "default", label: "Hired", className: "bg-green-500" },
      rejected: { variant: "destructive", label: "Rejected" },
      withdrawn: { variant: "secondary", label: "Withdrawn" },
    };
    const config = variants[status] || variants.active;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getUrgencyBadge = (lastActivity: string | null) => {
    if (!lastActivity) {
      return <Badge variant="destructive">No Activity</Badge>;
    }
    const daysSince = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 14) {
      return <Badge variant="destructive">Urgent</Badge>;
    } else if (daysSince > 7) {
      return <Badge variant="outline" className="border-amber-500 text-amber-500">Needs Follow-up</Badge>;
    }
    return null;
  };

  const getCurrentStage = (app: any) => {
    if (!app.stages || app.stages.length === 0) return "N/A";
    const stage = app.stages[app.current_stage_index];
    return stage?.name || "N/A";
  };

  const handleOpenAction = (app: any, action: 'advance' | 'reject') => {
    setActionDialog({ open: true, application: app, action });
  };

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No applications found matching your filters</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => {
                  // Use candidate_profiles if available, fallback to profiles
                  const candidate = app.candidate_profiles || app.profiles;
                  const lastActivity = candidate?.last_activity_at;
                  const companyId = app.jobs?.company_id || app.job?.company_id;
                  const visibility = getVisibleFields(app, companyId, role || 'partner');
                  
                  // Determine account status
                  const hasAccount = candidate?.has_account ?? (app.user_id ? true : false);
                  const accountStatusBadge = hasAccount 
                    ? null
                    : <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400 text-[10px]">Pending Signup</Badge>;
                  
                  return (
                    <TableRow key={app.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={visibility.avatar ? candidate?.avatar_url : undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {visibility.fullName && candidate?.full_name?.[0]?.toUpperCase() || 
                               candidate?.email?.[0]?.toUpperCase() || 
                               '👤'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold">
                                {visibility.fullName ? candidate?.full_name : 'Candidate'} 
                              </p>
                              {accountStatusBadge}
                            </div>
                            {visibility.email && candidate?.email && (
                              <p className="text-xs text-muted-foreground">{candidate.email}</p>
                            )}
                            {visibility.currentTitle && candidate?.current_title && (
                              <p className="text-xs text-muted-foreground">
                                {candidate.current_title}
                                {visibility.currentCompany && candidate.current_company && 
                                  ` @ ${candidate.current_company}`
                                }
                              </p>
                            )}
                            {visibility.desiredSalary && candidate?.desired_salary_min && (
                              <p className="text-xs text-primary font-medium">
                                Target: {candidate?.preferred_currency || 'USD'} {candidate?.desired_salary_min?.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {app.jobs?.companies?.logo_url && (
                            <img 
                              src={app.jobs.companies.logo_url} 
                              alt="" 
                              className="w-6 h-6 rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium text-sm">{app.jobs?.title || app.position}</p>
                            <p className="text-xs text-muted-foreground">
                              {app.jobs?.companies?.name || app.company_name}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getCurrentStage(app)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(app.status)}
                          {getUrgencyBadge(lastActivity)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {candidate?.source_channel || 'Direct'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {lastActivity 
                            ? new Date(lastActivity).toLocaleDateString()
                            : 'No activity'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(app.applied_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedApp(app);
                              setDetailOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/candidate/${candidate?.id}`)}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenAction(app, 'advance')}>
                                <UserCheck className="w-4 h-4 mr-2" />
                                Advance Stage
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenAction(app, 'reject')}>
                                <UserX className="w-4 h-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Send Message
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Calendar className="w-4 h-4 mr-2" />
                                Schedule Interview
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedApp && (
        <CandidateDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          application={selectedApp}
          stages={selectedApp.stages || []}
        />
      )}

      {actionDialog.application && actionDialog.action && (
        <CandidateActionDialog
          open={actionDialog.open}
          onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}
          application={actionDialog.application}
          action={actionDialog.action}
          stages={actionDialog.application.stages || []}
          onComplete={() => {
            onUpdate();
            setActionDialog({ open: false, application: null, action: null });
          }}
        />
      )}
    </>
  );
};
