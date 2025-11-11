import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  AlertCircle,
  Upload,
  MessageCircle,
  FileText
} from "lucide-react";
import { ProjectMilestone } from "@/types/projects";
import { format } from "date-fns";

interface MilestoneTimelineProps {
  milestones: ProjectMilestone[];
  view: 'freelancer' | 'client';
  onStartMilestone?: (milestoneId: string) => void;
  onUploadDeliverable?: (milestoneId: string) => void;
  onSubmitForReview?: (milestoneId: string) => void;
  onApproveMilestone?: (milestoneId: string) => void;
  onRequestRevision?: (milestoneId: string) => void;
  onViewComments?: (milestoneId: string) => void;
}

export function MilestoneTimeline({ 
  milestones, 
  view,
  onStartMilestone,
  onUploadDeliverable,
  onSubmitForReview,
  onApproveMilestone,
  onRequestRevision,
  onViewComments
}: MilestoneTimelineProps) {
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'submitted':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'revision_requested':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'paid':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'submitted':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'revision_requested':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="space-y-4">
      {milestones.map((milestone, index) => (
        <Card key={milestone.id} className="p-6 border border-border/50">
          <div className="flex gap-4">
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              {getStatusIcon(milestone.status)}
              {index < milestones.length - 1 && (
                <div className="w-0.5 h-full bg-border/50 mt-2" />
              )}
            </div>

            {/* Milestone content */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">
                      Milestone {milestone.milestone_number}: {milestone.title}
                    </h3>
                    <Badge className={`${getStatusColor(milestone.status)} border`}>
                      {getStatusLabel(milestone.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {milestone.description}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-xl font-bold text-foreground">
                    €{milestone.amount.toLocaleString()}
                  </div>
                  {milestone.due_date && (
                    <div className="text-xs text-muted-foreground">
                      Due {format(new Date(milestone.due_date), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
              </div>

              {/* Deliverable description */}
              {milestone.deliverable_description && (
                <div className="mb-3 p-3 bg-muted/30 rounded-md">
                  <div className="text-xs text-muted-foreground mb-1">Deliverables:</div>
                  <div className="text-sm text-foreground">
                    {milestone.deliverable_description}
                  </div>
                </div>
              )}

              {/* Status-specific info */}
              {milestone.status === 'submitted' && view === 'client' && (
                <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                  <div className="text-sm text-yellow-700 dark:text-yellow-400">
                    ⏰ Submitted for your review{' '}
                    {milestone.submitted_at && 
                      `${format(new Date(milestone.submitted_at), 'MMM d, h:mm a')}`
                    }
                  </div>
                </div>
              )}

              {milestone.status === 'revision_requested' && view === 'freelancer' && (
                <div className="mb-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-md">
                  <div className="text-sm text-orange-700 dark:text-orange-400 mb-2">
                    🔄 Revision requested by client
                  </div>
                  {milestone.feedback_from_client && (
                    <div className="text-sm text-foreground">
                      "{milestone.feedback_from_client}"
                    </div>
                  )}
                </div>
              )}

              {milestone.status === 'paid' && (
                <div className="mb-3 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                  <div className="text-sm text-green-700 dark:text-green-400">
                    ✓ Payment released{' '}
                    {milestone.paid_at && 
                      `on ${format(new Date(milestone.paid_at), 'MMM d, yyyy')}`
                    }
                  </div>
                </div>
              )}

              {/* Revision count */}
              {milestone.revision_count > 0 && (
                <div className="text-xs text-muted-foreground mb-3">
                  Revisions: {milestone.revision_count}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2">
                {view === 'freelancer' && (
                  <>
                    {milestone.status === 'pending' && (
                      <Button 
                        size="sm"
                        onClick={() => onStartMilestone?.(milestone.id)}
                      >
                        Start Milestone
                      </Button>
                    )}
                    
                    {milestone.status === 'in_progress' && (
                      <>
                        <Button 
                          size="sm"
                          onClick={() => onUploadDeliverable?.(milestone.id)}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Deliverable
                        </Button>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => onSubmitForReview?.(milestone.id)}
                        >
                          Mark Complete
                        </Button>
                      </>
                    )}

                    {milestone.status === 'revision_requested' && (
                      <Button 
                        size="sm"
                        onClick={() => onUploadDeliverable?.(milestone.id)}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Revised Version
                      </Button>
                    )}
                  </>
                )}

                {view === 'client' && milestone.status === 'submitted' && (
                  <>
                    <Button 
                      size="sm"
                      onClick={() => onApproveMilestone?.(milestone.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve & Release €{milestone.amount}
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => onRequestRevision?.(milestone.id)}
                    >
                      Request Revisions
                    </Button>
                  </>
                )}

                <Button 
                  size="sm"
                  variant="ghost"
                  onClick={() => onViewComments?.(milestone.id)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Comments
                </Button>

                {(milestone.submitted_files as any[])?.length > 0 && (
                  <Button 
                    size="sm"
                    variant="ghost"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Files ({(milestone.submitted_files as any[]).length})
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
