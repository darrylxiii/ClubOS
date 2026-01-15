import { memo } from "react";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  MessageSquare, 
  FileText, 
  Send, 
  UserCheck, 
  Clock,
  CheckCircle,
  Eye
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NextBestActionBadgeProps {
  stageIndex: number;
  stageName: string;
  daysInStage: number;
  hasScheduledInterview?: boolean;
  hasAssessment?: boolean;
  lastContactDays?: number;
  onAction?: (action: string) => void;
}

interface ActionConfig {
  label: string;
  icon: React.ElementType;
  action: string;
  variant: 'default' | 'outline' | 'secondary' | 'destructive';
  priority: 'high' | 'medium' | 'low';
}

export const NextBestActionBadge = memo(({
  stageIndex,
  stageName,
  daysInStage,
  hasScheduledInterview = false,
  hasAssessment = false,
  lastContactDays = 0,
  onAction
}: NextBestActionBadgeProps) => {
  
  // Determine the next best action based on context
  const getNextBestAction = (): ActionConfig => {
    const stageNameLower = stageName.toLowerCase();
    
    // Applied stage
    if (stageIndex === 0 || stageNameLower.includes('applied')) {
      if (daysInStage > 2) {
        return {
          label: 'Review',
          icon: Eye,
          action: 'review',
          variant: 'default',
          priority: 'high'
        };
      }
      return {
        label: 'Screen',
        icon: FileText,
        action: 'screen',
        variant: 'secondary',
        priority: 'medium'
      };
    }
    
    // Screening stage
    if (stageNameLower.includes('screen')) {
      if (!hasScheduledInterview) {
        return {
          label: 'Schedule',
          icon: Calendar,
          action: 'schedule',
          variant: 'default',
          priority: 'high'
        };
      }
      return {
        label: 'Waiting',
        icon: Clock,
        action: 'waiting',
        variant: 'outline',
        priority: 'low'
      };
    }
    
    // Interview stage
    if (stageNameLower.includes('interview')) {
      if (hasScheduledInterview) {
        return {
          label: 'Prep Brief',
          icon: FileText,
          action: 'prep',
          variant: 'secondary',
          priority: 'medium'
        };
      }
      if (daysInStage > 3) {
        return {
          label: 'Follow Up',
          icon: MessageSquare,
          action: 'followup',
          variant: 'default',
          priority: 'high'
        };
      }
      return {
        label: 'Schedule',
        icon: Calendar,
        action: 'schedule',
        variant: 'default',
        priority: 'high'
      };
    }
    
    // Offer stage
    if (stageNameLower.includes('offer')) {
      if (daysInStage > 5) {
        return {
          label: 'Close Deal',
          icon: CheckCircle,
          action: 'close',
          variant: 'default',
          priority: 'high'
        };
      }
      return {
        label: 'Send Offer',
        icon: Send,
        action: 'send_offer',
        variant: 'default',
        priority: 'high'
      };
    }
    
    // Final/Hired stage
    if (stageNameLower.includes('hire') || stageNameLower.includes('final')) {
      return {
        label: 'Complete',
        icon: UserCheck,
        action: 'complete',
        variant: 'secondary',
        priority: 'low'
      };
    }
    
    // Default: follow up if stale, otherwise schedule
    if (daysInStage > 5 || lastContactDays > 3) {
      return {
        label: 'Follow Up',
        icon: MessageSquare,
        action: 'followup',
        variant: 'default',
        priority: 'high'
      };
    }
    
    return {
      label: 'Schedule',
      icon: Calendar,
      action: 'schedule',
      variant: 'secondary',
      priority: 'medium'
    };
  };

  const action = getNextBestAction();
  const Icon = action.icon;

  const getPriorityStyles = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20';
      case 'medium':
        return 'bg-muted text-foreground border-border hover:bg-muted/80';
      case 'low':
        return 'bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted/70';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`h-6 px-2 text-xs gap-1 transition-all ${getPriorityStyles(action.priority)}`}
            onClick={(e) => {
              e.stopPropagation();
              onAction?.(action.action);
            }}
          >
            <Icon className="w-3 h-3" />
            {action.label}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">Recommended next step</p>
          <p className="text-muted-foreground">
            {action.action === 'review' && 'Review application and advance or decline'}
            {action.action === 'screen' && 'Review candidate for initial screening'}
            {action.action === 'schedule' && 'Schedule an interview with candidate'}
            {action.action === 'followup' && 'Send a follow-up message'}
            {action.action === 'prep' && 'Generate interview prep brief'}
            {action.action === 'send_offer' && 'Prepare and send offer letter'}
            {action.action === 'close' && 'Finalize hiring decision'}
            {action.action === 'complete' && 'Complete onboarding process'}
            {action.action === 'waiting' && 'Waiting for scheduled interview'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

NextBestActionBadge.displayName = 'NextBestActionBadge';
