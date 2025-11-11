import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  DollarSign, 
  Edit, 
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { TimeEntry } from "@/types/projects";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface TimeEntryCardProps {
  entry: TimeEntry;
  view: 'freelancer' | 'client';
  onEdit?: (entryId: string) => void;
  onDelete?: (entryId: string) => void;
  onApprove?: (entryId: string) => void;
  onDispute?: (entryId: string) => void;
}

export function TimeEntryCard({ 
  entry, 
  view,
  onEdit,
  onDelete,
  onApprove,
  onDispute
}: TimeEntryCardProps) {
  
  const getStatusIcon = () => {
    switch (entry.status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disputed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'invoiced':
      case 'paid':
        return <DollarSign className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (entry.status) {
      case 'approved':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'disputed':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'invoiced':
      case 'paid':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default:
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    }
  };

  return (
    <Card className="p-4 border border-border/50 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {format(new Date(entry.date), 'EEE, MMM d, yyyy')}
          </span>
          {entry.start_time && entry.end_time && (
            <span className="text-xs text-muted-foreground">
              {entry.start_time} - {entry.end_time}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge className={cn("border", getStatusColor())}>
            {getStatusIcon()}
            <span className="ml-1 capitalize">{entry.status}</span>
          </Badge>
          {!entry.is_billable && (
            <Badge variant="outline" className="border-gray-500/20">
              Non-billable
            </Badge>
          )}
        </div>
      </div>

      {/* Task Description */}
      <p className="text-sm text-foreground mb-3 line-clamp-2">
        {entry.task_description}
      </p>

      {/* Tags */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {entry.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Hours and Amount */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Hours: </span>
            <span className="font-semibold text-foreground">
              {entry.hours_worked.toFixed(2)}h
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Rate: </span>
            <span className="font-medium text-foreground">
              €{entry.hourly_rate}/hr
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xl font-bold text-foreground">
            €{entry.total_amount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Actions */}
      {entry.status === 'pending' && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
          {view === 'freelancer' && (
            <>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onEdit?.(entry.id)}
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => onDelete?.(entry.id)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </>
          )}

          {view === 'client' && (
            <>
              <Button 
                size="sm"
                onClick={() => onApprove?.(entry.id)}
                className="flex-1"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Approve
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onDispute?.(entry.id)}
              >
                <XCircle className="h-3 w-3 mr-1" />
                Dispute
              </Button>
            </>
          )}
        </div>
      )}

      {entry.status === 'approved' && entry.approved_at && (
        <div className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
          Approved on {format(new Date(entry.approved_at), 'MMM d, yyyy')}
        </div>
      )}
    </Card>
  );
}
