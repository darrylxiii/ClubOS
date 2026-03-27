import { memo, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lock, ExternalLink } from "lucide-react";
import { JobStatusBadge, JobStatus } from "@/components/jobs/JobStatusBadge";
import { ContinuousPipelineBadge } from "@/components/jobs/ContinuousPipelineBadge";
import { UrgencyBadge } from "@/components/jobs/UrgencyBadge";
import { UrgencyMeter } from "@/components/jobs/UrgencyMeter";
import { computeJobUrgencyScore, getUrgencyAccentHsl } from "@/lib/jobUrgencyScore";
import { useTranslation } from 'react-i18next';

interface JobCardHeaderProps {
  companyLogo: string | null;
  companyName: string;
  title: string;
  status: string;
  clubSyncBadge: React.ReactNode;
  isStealth?: boolean;
  isContinuous?: boolean;
  hiredCount?: number;
  targetHireCount?: number | null;
  externalUrl?: string | null;
  daysOpen?: number;
  lastActivityDaysAgo?: number;
  applicantsCount?: number;
  isAdmin?: boolean;
  urgencyScoreManual?: number | null;
  expectedCloseDate?: string | null;
  expectedStartDate?: string | null;
  urgency?: string | null;
  dealHealthScore?: number | null;
  conversionRate?: number | null;
  jobId?: string;
}

export const JobCardHeader = memo(({
  companyLogo,
  companyName,
  title,
  status,
  clubSyncBadge,
  isStealth,
  isContinuous = false,
  hiredCount = 0,
  targetHireCount,
  externalUrl,
  daysOpen = 0,
  lastActivityDaysAgo = 0,
  applicantsCount = 0,
  isAdmin = false,
  urgencyScoreManual,
  expectedCloseDate,
  expectedStartDate,
  urgency,
  dealHealthScore,
  conversionRate,
  jobId,
}: JobCardHeaderProps) => {
  const { t } = useTranslation('partner');
  const urgencyResult = useMemo(() => computeJobUrgencyScore({
    daysOpen,
    expectedCloseDate,
    expectedStartDate,
    urgency,
    dealHealthScore,
    candidateCount: applicantsCount,
    activeCount: 0,
    conversionRate: conversionRate ?? null,
    lastActivityDaysAgo,
    manualScore: urgencyScoreManual,
  }), [daysOpen, expectedCloseDate, expectedStartDate, urgency, dealHealthScore, applicantsCount, conversionRate, lastActivityDaysAgo, urgencyScoreManual]);
  return (
    <div className="flex items-center gap-3 flex-1">
      {/* Avatar with urgency dot overlay */}
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12 border-2 border-border/20">
          <AvatarImage src={companyLogo || undefined} alt={companyName} />
          <AvatarFallback className="bg-card/40 text-foreground font-bold">
            {companyName.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {jobId && (
          <div className="absolute -top-1.5 -right-1.5">
            <UrgencyMeter
              jobId={jobId}
              result={urgencyResult}
              isAdmin={isAdmin}
              size="sm"
              variant="dot"
            />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-black uppercase mb-1 truncate">
            {title}
          </CardTitle>
          {externalUrl && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('jobCardHeader.viewOriginalPosting')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-2 truncate">{companyName}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <JobStatusBadge status={status as JobStatus} size="sm" />
          <ContinuousPipelineBadge
            isContinuous={isContinuous}
            hiredCount={hiredCount}
            targetHireCount={targetHireCount}
            size="sm"
          />
          {isStealth && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge 
                    variant="outline" 
                    className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1"
                  >
                    <Lock className="h-3 w-3" />
                    Confidential
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('jobCardHeader.thisJobIsOnlyVisibleToSelectedUsers')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {clubSyncBadge}
        </div>
      </div>
    </div>
  );
});

JobCardHeader.displayName = 'JobCardHeader';
