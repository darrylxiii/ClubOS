import { useState } from 'react';
import {
  Briefcase, Building2, Calendar, Download, ExternalLink,
  GraduationCap, Linkedin, MapPin, Star, User, Clock,
  ChevronDown, ChevronUp, Shield, Zap, TrendingUp,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ReviewQueueApplication } from '@/hooks/useReviewQueue';
import { useTranslation } from 'react-i18next';

interface CandidateReviewCardProps {
  application: ReviewQueueApplication;
  compact?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

function formatTagLabel(tag: string): string {
  return tag
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatComp(min: number | null, max: number | null, currency: string | null) {
  if (!min && !max) return null;
  const fmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'EUR',
    maximumFractionDigits: 0,
  });
  if (min && max) return `${fmt.format(min)} – ${fmt.format(max)}`;
  return fmt.format(min || max || 0);
}

function getMatchColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground';
  if (score >= 85) return 'text-success';
  if (score >= 65) return 'text-warning';
  return 'text-destructive';
}

function getMatchBg(score: number | null): string {
  if (score === null) return 'bg-muted/20';
  if (score >= 85) return 'bg-success/15';
  if (score >= 65) return 'bg-warning/15';
  return 'bg-destructive/15';
}

function getAiRecommendationStyle(rec: string | null) {
  if (!rec) return null;
  const lower = rec.toLowerCase();
  if (lower.includes('strong') || lower.includes('excellent') || lower.includes('top'))
    return { icon: Zap, color: 'text-success', bg: 'bg-success/15 border-success/30' };
  if (lower.includes('caution') || lower.includes('not a fit') || lower.includes('unlikely'))
    return { icon: Shield, color: 'text-destructive', bg: 'bg-destructive/15 border-destructive/30' };
  return { icon: TrendingUp, color: 'text-warning', bg: 'bg-warning/15 border-warning/30' };
}

function requirementMatchCount(skills: string[], requirements: unknown[]): { matched: number; total: number; items: Array<{ name: string; met: boolean }> } {
  const reqStrings = requirements
    .map((r) => {
      if (typeof r === 'string') return r;
      if (r && typeof r === 'object' && 'name' in r) return String((r as { name: string }).name);
      if (r && typeof r === 'object' && 'skill' in r) return String((r as { skill: string }).skill);
      return null;
    })
    .filter(Boolean) as string[];

  const skillsLower = new Set(skills.map((s) => s.toLowerCase()));
  const items = reqStrings.map((req) => ({
    name: req,
    met: skillsLower.has(req.toLowerCase()) || skills.some((s) => s.toLowerCase().includes(req.toLowerCase()) || req.toLowerCase().includes(s.toLowerCase())),
  }));

  return { matched: items.filter((i) => i.met).length, total: items.length, items };
}

export function CandidateReviewCard({
  application: app, compact = false, selected = false, onSelect }: CandidateReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation('partner');

  const salaryDisplay = formatComp(app.candidateDesiredSalaryMin, app.candidateDesiredSalaryMax, app.currency);
  const jobSalaryDisplay = formatComp(app.salaryMin, app.salaryMax, app.currency);
  const aiRecStyle = getAiRecommendationStyle(app.candidateAiRecommendation);

  const reqMatch = app.jobRequirements && app.jobRequirements.length > 0
    ? requirementMatchCount(app.candidateSkills, app.jobRequirements)
    : null;

  if (compact) {
    return (
      <button
        onClick={onSelect}
        className={cn(
          'w-full text-left rounded-xl p-3 transition-all duration-200 border',
          selected
            ? 'bg-primary/10 border-primary/30 shadow-sm'
            : 'bg-card/30 border-border/20 hover:border-border/40 hover:bg-card/50',
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={app.candidateAvatarUrl || undefined} />
              <AvatarFallback className="text-xs">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            {app.matchScore !== null && (
              <div className={cn(
                'absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-background',
                getMatchBg(app.matchScore), getMatchColor(app.matchScore),
              )}>
                {app.matchScore}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{app.candidateName}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {app.candidateTitle || 'No title'} {app.candidateCurrentCompany ? `· ${app.candidateCurrentCompany}` : ''}
            </p>
          </div>
          {aiRecStyle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn('p-1 rounded-md border', aiRecStyle.bg)}>
                  <aiRecStyle.icon className={cn('h-3 w-3', aiRecStyle.color)} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">{app.candidateAiRecommendation}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className={cn(
      'rounded-xl border transition-all duration-300',
      selected ? 'border-primary/40 shadow-md bg-card/80' : 'border-border/30 bg-card/40',
    )}>
      {/* Hero section */}
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 ring-2 ring-background shadow-lg">
            <AvatarImage src={app.candidateAvatarUrl || undefined} />
            <AvatarFallback>
              <User className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold">{app.candidateName}</h3>
              {app.candidateLinkedinUrl && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={app.candidateLinkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0A66C2] hover:opacity-80 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>{"View LinkedIn"}</TooltipContent>
                </Tooltip>
              )}
              {app.candidateResumeUrl && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <a
                      href={app.candidateResumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:opacity-80 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </TooltipTrigger>
                  <TooltipContent>{"Download Resume"}</TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {app.candidateTitle || 'Title not set'}
              {app.candidateCurrentCompany && (
                <span> · {app.candidateCurrentCompany}</span>
              )}
            </p>
            {/* Meta row */}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {app.candidateYearsOfExperience !== null && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {app.candidateYearsOfExperience}y exp
                </span>
              )}
              {app.candidateLocation && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {app.candidateLocation}
                </span>
              )}
              {app.candidateRemotePreference && (
                <Badge variant="outline" className="text-[10px] h-5">
                  {formatTagLabel(app.candidateRemotePreference)}
                </Badge>
              )}
              {app.candidateNoticePeriod && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {app.candidateNoticePeriod}
                </span>
              )}
            </div>
          </div>
          {/* Match Score Ring */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            <div className={cn(
              'relative h-16 w-16 rounded-full flex items-center justify-center border-[3px]',
              app.matchScore !== null && app.matchScore >= 85 ? 'border-success' :
              app.matchScore !== null && app.matchScore >= 65 ? 'border-warning' :
              app.matchScore !== null ? 'border-destructive' : 'border-muted',
            )}>
              <span className={cn('text-lg font-bold', getMatchColor(app.matchScore))}>
                {app.matchScore ?? '—'}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">{"Match"}</span>
          </div>
        </div>

        {/* AI Recommendation banner */}
        {app.candidateAiRecommendation && aiRecStyle && (
          <div className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 border text-sm',
            aiRecStyle.bg,
          )}>
            <aiRecStyle.icon className={cn('h-4 w-4 shrink-0', aiRecStyle.color)} />
            <span className={cn('font-medium', aiRecStyle.color)}>{app.candidateAiRecommendation}</span>
          </div>
        )}

        {/* AI Summary */}
        {app.candidateAiSummary && (
          <div className="rounded-lg bg-muted/30 border border-border/20 p-3 text-sm text-muted-foreground italic">
            <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-1">{"AI Summary"}</p>
            {app.candidateAiSummary}
          </div>
        )}

        {/* Salary alignment */}
        {(salaryDisplay || jobSalaryDisplay) && (
          <div className="flex items-center gap-4 text-sm">
            {salaryDisplay && (
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{"Expects"}</span>
                <p className="font-medium">{salaryDisplay}</p>
              </div>
            )}
            {jobSalaryDisplay && (
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{"Budget"}</span>
                <p className="font-medium">{jobSalaryDisplay}</p>
              </div>
            )}
          </div>
        )}

        {/* Requirements Match Grid */}
        {reqMatch && reqMatch.total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{"Requirements Match"}</span>
              <span className={cn(
                'text-xs font-semibold',
                reqMatch.matched / reqMatch.total >= 0.7 ? 'text-success' :
                reqMatch.matched / reqMatch.total >= 0.4 ? 'text-warning' : 'text-destructive',
              )}>
                {reqMatch.matched}/{reqMatch.total}
              </span>
            </div>
            <Progress
              value={(reqMatch.matched / reqMatch.total) * 100}
              className="h-1.5"
            />
            <div className="flex flex-wrap gap-1.5">
              {reqMatch.items.slice(0, 8).map((item) => (
                <Badge
                  key={item.name}
                  variant="outline"
                  className={cn(
                    'text-[10px]',
                    item.met
                      ? 'border-success/40 text-success bg-success/10'
                      : 'border-destructive/30 text-destructive/70 bg-destructive/5',
                  )}
                >
                  {item.met ? '✓' : '✗'} {item.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {app.candidateSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {app.candidateSkills.slice(0, compact ? 4 : 10).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-[11px]">
                {skill}
              </Badge>
            ))}
            {app.candidateSkills.length > 10 && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                +{app.candidateSkills.length - 10}
              </Badge>
            )}
          </div>
        )}

        {/* Source info */}
        {(app.candidateSourceChannel || app.candidateSourcedBy) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {app.candidateSourceChannel && (
              <span>Source: {formatTagLabel(app.candidateSourceChannel)}</span>
            )}
            {app.candidateSourcedBy && (
              <span>Sourced by {app.candidateSourcedBy}</span>
            )}
          </div>
        )}

        {/* Internal review notes */}
        {app.internalReviewNotes && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm">
            <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider mb-1">{t('candidateReviewCard.internalReviewNotes')}</p>
            <p className="text-foreground/80">{app.internalReviewNotes}</p>
          </div>
        )}
      </div>

      {/* Expandable details */}
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-border/20 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors">
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {expanded ? 'Less detail' : 'Full profile'}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-5 pb-5 space-y-4 border-t border-border/10">
            {/* Work History */}
            {app.candidateWorkHistory && app.candidateWorkHistory.length > 0 && (
              <div className="space-y-2 pt-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="h-3 w-3" /> Work History
                </p>
                <div className="space-y-2">
                  {app.candidateWorkHistory.slice(0, 4).map((entry, i) => {
                    const e = entry as Record<string, unknown>;
                    return (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-2 shrink-0" />
                        <div>
                          <p className="font-medium">{String(e.title || e.role || e.position || 'Role')}</p>
                          <p className="text-xs text-muted-foreground">
                            {String(e.company || e.organization || '')}
                            {e.duration ? ` · ${String(e.duration)}` : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Education */}
            {app.candidateEducation && app.candidateEducation.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="h-3 w-3" /> Education
                </p>
                <div className="space-y-2">
                  {app.candidateEducation.slice(0, 3).map((entry, i) => {
                    const e = entry as Record<string, unknown>;
                    return (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-2 shrink-0" />
                        <div>
                          <p className="font-medium">{String(e.degree || e.qualification || 'Degree')}</p>
                          <p className="text-xs text-muted-foreground">
                            {String(e.institution || e.school || '')}
                            {e.year ? ` · ${String(e.year)}` : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Job context */}
            {app.jobDescription && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{"Role Context"}</p>
                <p className="text-xs text-muted-foreground line-clamp-3">{app.jobDescription}</p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
