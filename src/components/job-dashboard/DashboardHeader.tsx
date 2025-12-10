import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Edit, MoreHorizontal, Trophy, XCircle, Archive, Trash2,
  MapPin, Clock, Users, Building2
} from "lucide-react";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

interface DashboardHeaderProps {
  job: any;
  role: string | null;
  onEditJob: () => void;
  onCloseHired: () => void;
  onCloseLost: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

export const DashboardHeader = memo(({
  job,
  role,
  onEditJob,
  onCloseHired,
  onCloseLost,
  onArchive,
  onDelete
}: DashboardHeaderProps) => {
  const navigate = useNavigate();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'draft': return 'bg-muted text-muted-foreground border-muted';
      case 'closed': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'archived': return 'bg-muted/50 text-muted-foreground border-muted/50';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  return (
    <header className="flex flex-col gap-4 pb-6 border-b border-border/40">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/jobs')}
          className="h-8 px-2 hover:bg-muted/50"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Jobs
        </Button>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[200px]">{job.title}</span>
      </nav>

      {/* Main Header Row */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          {/* Company Logo */}
          {job.companies?.logo_url ? (
            <img
              src={job.companies.logo_url}
              alt={job.companies.name}
              className="w-12 h-12 rounded-xl object-cover border border-border/40"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center border border-border/40">
              <Building2 className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {job.title}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>{job.companies?.name}</span>
              {job.location && (
                <>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {job.location}
                  </span>
                </>
              )}
              {job.employment_type && (
                <>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                  <span className="flex items-center gap-1 capitalize">
                    <Clock className="w-3.5 h-3.5" />
                    {job.employment_type}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline"
            className={`h-7 px-3 text-xs font-medium capitalize ${getStatusColor(job.status)}`}
          >
            {job.status}
          </Badge>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onEditJob}
            className="h-8 gap-1.5"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {job.status !== 'closed' && (
                <>
                  <DropdownMenuItem onClick={onCloseHired} className="gap-2">
                    <Trophy className="w-4 h-4 text-emerald-600" />
                    Mark as Hired
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onCloseLost} className="gap-2">
                    <XCircle className="w-4 h-4" />
                    Close - Not Filled
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={onArchive} className="gap-2">
                <Archive className="w-4 h-4" />
                Archive Job
              </DropdownMenuItem>
              {(job.status === 'draft' || role === 'admin') && (
                <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive">
                  <Trash2 className="w-4 h-4" />
                  Delete Job
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
});

DashboardHeader.displayName = 'DashboardHeader';
