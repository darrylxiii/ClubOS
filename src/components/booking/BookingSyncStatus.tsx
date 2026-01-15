import { CheckCircle2, AlertCircle, Calendar, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BookingSyncStatusProps {
  syncedToCalendar?: boolean;
  calendarProvider?: string | null;
  meetingCreated?: boolean;
  clubAIEnabled?: boolean;
  className?: string;
}

export function BookingSyncStatus({ 
  syncedToCalendar, 
  calendarProvider, 
  meetingCreated,
  clubAIEnabled,
  className = ""
}: BookingSyncStatusProps) {
  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Calendar Sync Status */}
        {syncedToCalendar ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="text-xs gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                {calendarProvider === 'google' ? 'Google' : 'Microsoft'} Calendar
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Synced to {calendarProvider === 'google' ? 'Google' : 'Microsoft'} Calendar</p>
            </TooltipContent>
          </Tooltip>
        ) : calendarProvider === null ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs gap-1">
                <Calendar className="h-3 w-3" />
                No calendar
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>No calendar sync configured for this booking link</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs gap-1">
                <AlertCircle className="h-3 w-3 text-amber-600" />
                Not synced
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Calendar sync failed or pending</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Meeting Status */}
        {meetingCreated && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="text-xs gap-1">
                <Video className="h-3 w-3 text-blue-600" />
                Meeting{clubAIEnabled && ' + AI'}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Quantum Club meeting created{clubAIEnabled && ' with AI enabled'}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
