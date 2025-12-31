import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Globe, Clock, AlertTriangle } from "lucide-react";

interface TimezoneWarningProps {
  guestTimezone: string;
  hostTimezone: string;
  showToggle?: boolean;
}

/**
 * Calculate the timezone offset difference in hours between two timezones
 */
function getTimezoneOffsetDifference(tz1: string, tz2: string): number {
  try {
    const now = new Date();
    
    // Get offset for timezone 1
    const date1 = new Date(now.toLocaleString("en-US", { timeZone: tz1 }));
    const date2 = new Date(now.toLocaleString("en-US", { timeZone: tz2 }));
    
    // Calculate difference in hours
    const diffMs = date1.getTime() - date2.getTime();
    const diffHours = Math.abs(diffMs / (1000 * 60 * 60));
    
    return diffHours;
  } catch {
    return 0;
  }
}

/**
 * Format timezone name for display
 */
function formatTimezoneName(tz: string): string {
  return tz.replace(/_/g, " ").replace(/\//g, " / ");
}

/**
 * Get current time in a timezone
 */
function getCurrentTimeInTimezone(tz: string): string {
  try {
    return new Date().toLocaleTimeString("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

export function TimezoneWarning({ 
  guestTimezone, 
  hostTimezone, 
  showToggle = true 
}: TimezoneWarningProps) {
  const [showInGuestTz, setShowInGuestTz] = useState(true);

  // Don't show if timezones are the same
  if (guestTimezone === hostTimezone) {
    return null;
  }

  const hoursDifference = getTimezoneOffsetDifference(guestTimezone, hostTimezone);
  
  // Only show warning if difference is significant (> 4 hours)
  const isSignificantDifference = hoursDifference > 4;

  if (!isSignificantDifference) {
    // Show subtle timezone info without warning
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
        <Globe className="w-3 h-3" />
        <span>
          Your timezone: {formatTimezoneName(guestTimezone)} • 
          Host timezone: {formatTimezoneName(hostTimezone)}
        </span>
      </div>
    );
  }

  return (
    <Alert className="border-amber-500/50 bg-amber-500/10">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertDescription className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="font-medium text-amber-400">
              Timezone Difference: {Math.round(hoursDifference)} hours
            </p>
            <p className="text-sm text-muted-foreground">
              Please double-check the meeting time is convenient for you.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-background/50 p-2 rounded border border-border/50">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="w-3 h-3" />
              <span className="font-medium">Your Time</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatTimezoneName(guestTimezone)}
            </p>
            <p className="text-xs">
              Currently: {getCurrentTimeInTimezone(guestTimezone)}
            </p>
          </div>
          
          <div className="bg-background/50 p-2 rounded border border-border/50">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="w-3 h-3" />
              <span className="font-medium">Host's Time</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatTimezoneName(hostTimezone)}
            </p>
            <p className="text-xs">
              Currently: {getCurrentTimeInTimezone(hostTimezone)}
            </p>
          </div>
        </div>

        {showToggle && (
          <div className="flex items-center gap-2">
            <Button
              variant={showInGuestTz ? "default" : "outline"}
              size="sm"
              className="text-xs h-7"
              onClick={() => setShowInGuestTz(true)}
            >
              Show in my timezone
            </Button>
            <Button
              variant={!showInGuestTz ? "default" : "outline"}
              size="sm"
              className="text-xs h-7"
              onClick={() => setShowInGuestTz(false)}
            >
              Show in host's timezone
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
