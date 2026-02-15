import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Globe, Shield } from "lucide-react";
import { candidateProfileTokens } from "@/config/candidate-profile-tokens";
import { format, parseISO, differenceInDays } from "date-fns";

interface AvailabilityNoticeCardProps {
  candidate: any;
}

const AVAILABILITY_CONFIG: Record<string, { label: string; className: string }> = {
  immediately: { label: 'Immediately', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  within_2_weeks: { label: '< 2 weeks', className: 'bg-green-500/10 text-green-500 border-green-500/20' },
  within_1_month: { label: '< 1 month', className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
  within_3_months: { label: '< 3 months', className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  not_available: { label: 'Not available', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
  open_to_offers: { label: 'Open to offers', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
};

export function AvailabilityNoticeCard({ candidate }: AvailabilityNoticeCardProps) {
  const noticePeriod = candidate.notice_period;
  const availabilityStatus = candidate.availability_status || candidate.availability;
  const earliestStart = candidate.earliest_start_date;
  const workAuth = candidate.work_authorization || candidate.work_eligibility;

  const hasData = noticePeriod || availabilityStatus || earliestStart || workAuth;

  if (!hasData) return null;

  const availConfig = availabilityStatus
    ? AVAILABILITY_CONFIG[availabilityStatus] || { label: availabilityStatus.replace(/_/g, ' '), className: 'bg-muted text-muted-foreground' }
    : null;

  const daysUntilStart = earliestStart
    ? differenceInDays(parseISO(earliestStart), new Date())
    : null;

  return (
    <Card className={candidateProfileTokens.glass.card}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Availability & Notice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Availability status */}
        {availConfig && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Status</span>
            <Badge variant="outline" className={`text-xs ${availConfig.className}`}>
              {availConfig.label}
            </Badge>
          </div>
        )}

        {/* Notice period */}
        {noticePeriod && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Notice period</span>
            </div>
            <span className="text-sm font-medium">
              {typeof noticePeriod === 'number' ? `${noticePeriod} days` : noticePeriod}
            </span>
          </div>
        )}

        {/* Earliest start */}
        {earliestStart && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Earliest start</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium">{format(parseISO(earliestStart), 'MMM d, yyyy')}</span>
              {daysUntilStart != null && daysUntilStart > 0 && (
                <p className="text-[10px] text-muted-foreground">{daysUntilStart} days from now</p>
              )}
              {daysUntilStart != null && daysUntilStart <= 0 && (
                <p className="text-[10px] text-green-500">Available now</p>
              )}
            </div>
          </div>
        )}

        {/* Work authorization */}
        {workAuth && (
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Work authorization</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-500" />
              <span className="text-xs">
                {typeof workAuth === 'string' ? workAuth.replace(/_/g, ' ') : 'Verified'}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
