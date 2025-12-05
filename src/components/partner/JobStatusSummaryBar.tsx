import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileEdit, 
  CheckCircle, 
  XCircle, 
  Archive,
  Rocket,
  Loader2
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type JobStatusFilter = 'all' | 'draft' | 'published' | 'closed' | 'archived';

interface JobStatusCounts {
  all: number;
  draft: number;
  published: number;
  closed: number;
  archived: number;
}

interface JobStatusSummaryBarProps {
  counts: JobStatusCounts;
  currentStatus: JobStatusFilter;
  onStatusChange: (status: JobStatusFilter) => void;
  onPublishAllDrafts?: () => void;
  isPublishingAll?: boolean;
}

const statusConfig: Record<JobStatusFilter, { 
  label: string; 
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = {
  all: { label: 'All Jobs', icon: CheckCircle, color: 'text-foreground' },
  draft: { label: 'Draft', icon: FileEdit, color: 'text-muted-foreground' },
  published: { label: 'Active', icon: CheckCircle, color: 'text-success' },
  closed: { label: 'Closed', icon: XCircle, color: 'text-warning' },
  archived: { label: 'Archived', icon: Archive, color: 'text-muted-foreground' },
};

export const JobStatusSummaryBar = memo(({ 
  counts, 
  currentStatus, 
  onStatusChange,
  onPublishAllDrafts,
  isPublishingAll = false
}: JobStatusSummaryBarProps) => {
  const statuses: JobStatusFilter[] = ['all', 'published', 'draft', 'closed', 'archived'];
  
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-card/30 backdrop-blur-sm border border-border/20">
      {/* Status Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
        {statuses.map((status) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          const count = counts[status];
          const isActive = currentStatus === status;
          
          return (
            <Button
              key={status}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className={`gap-2 whitespace-nowrap transition-all ${
                isActive 
                  ? 'bg-primary/20 text-primary border border-primary/30' 
                  : 'hover:bg-card/50'
              }`}
              onClick={() => onStatusChange(status)}
            >
              <Icon className={`w-4 h-4 ${isActive ? config.color : 'text-muted-foreground'}`} />
              <span className="hidden sm:inline">{config.label}</span>
              <Badge 
                variant="outline" 
                className={`ml-1 px-1.5 h-5 text-xs ${
                  isActive 
                    ? 'bg-primary/10 border-primary/30 text-primary' 
                    : 'bg-card/40 border-border/20'
                } ${count === 0 ? 'opacity-50' : ''}`}
              >
                {count}
              </Badge>
            </Button>
          );
        })}
      </div>
      
      {/* Publish All Drafts Action */}
      {counts.draft > 0 && onPublishAllDrafts && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 border-success/30 text-success hover:bg-success/10 hover:text-success whitespace-nowrap"
              disabled={isPublishingAll}
            >
              {isPublishingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Rocket className="w-4 h-4" />
              )}
              Publish All {counts.draft} Drafts
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Publish All Draft Jobs?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  This will publish <strong>{counts.draft} draft job{counts.draft !== 1 ? 's' : ''}</strong> and make them visible to candidates.
                </p>
                <p className="text-sm text-muted-foreground">
                  Published jobs will appear in search results and candidates can apply to them.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={onPublishAllDrafts}
                className="bg-success hover:bg-success/90"
              >
                <Rocket className="w-4 h-4 mr-2" />
                Publish All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
});

JobStatusSummaryBar.displayName = 'JobStatusSummaryBar';
