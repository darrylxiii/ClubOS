import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Send, Calendar, Edit, Linkedin, User,
  AlertCircle, CheckCircle, Mail, Phone, MapPin,
  RefreshCw, Scan, Briefcase, Target, Activity,
  Users, DollarSign, Sparkles, ChevronDown
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { candidateProfileTokens, getScoreColor } from "@/config/candidate-profile-tokens";
import { ensureHttpsUrl } from "@/utils/urlHelpers";
import { useState } from "react";
import { EnrichmentProgressModal } from "./EnrichmentProgressModal";
import { AddToJobDialog } from "@/components/partner/AddToJobDialog";
import { useRecharts } from "@/hooks/useRecharts";
import { formatRelativeTime } from "@/lib/format";
import type { AssessmentBreakdown, AssessmentDimension } from "@/hooks/useAssessmentScores";
import { useTranslation } from 'react-i18next';

const DIMENSION_CONFIG = [
  { key: 'skills_match', label: 'Skills', icon: Target, color: 'hsl(var(--primary))' },
  { key: 'experience', label: 'Experience', icon: Briefcase, color: 'hsl(var(--chart-2))' },
  { key: 'engagement', label: 'Engagement', icon: Activity, color: 'hsl(var(--chart-3))' },
  { key: 'culture_fit', label: 'Culture Fit', icon: Users, color: 'hsl(var(--chart-4))' },
  { key: 'salary_match', label: 'Salary', icon: DollarSign, color: 'hsl(var(--chart-5))' },
  { key: 'location_match', label: 'Location', icon: MapPin, color: 'hsl(142, 76%, 36%)' },
] as const;

interface Props {
  candidate: any;
  fromJob?: string;
  stage?: string;
  isAdmin?: boolean;
  onAdvance?: () => void;
  onDecline?: () => void;
  onMessage?: () => void;
  onSchedule?: () => void;
  onEdit?: () => void;
  onRefresh?: () => void;
  assessmentBreakdown?: AssessmentBreakdown | null;
  assessmentLoading?: boolean;
  isComputing?: boolean;
  onRecompute?: () => void;
  applicationId?: string | null;
}

export const CandidateHeroSection = ({
  candidate,
  fromJob,
  stage,
  isAdmin = false,
  onAdvance,
  onDecline,
  onMessage,
  onSchedule,
  onEdit,
  onRefresh,
  assessmentBreakdown,
  assessmentLoading,
  isComputing,
  onRecompute,
  applicationId,
}: Props) => {
  const navigate = useNavigate();
  const { t } = useTranslation('candidates');
  const { recharts, isLoading: chartsLoading } = useRecharts();
  const [enrichModal, setEnrichModal] = useState<{ open: boolean; mode: 'linkedin' | 'deep-enrich' }>({
    open: false,
    mode: 'linkedin',
  });
  const [addToJobOpen, setAddToJobOpen] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const hasAccount = !!candidate.user_id;
  const breakdown = assessmentBreakdown;

  const candidateName = candidate.first_name && candidate.last_name
    ? `${candidate.first_name} ${candidate.last_name}`
    : candidate.full_name || candidate.email?.split('@')[0] || 'Unnamed Candidate';

  const initials = candidateName
    .split(' ')
    .map((n: string) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const getConfidenceIndicator = (confidence: number) => {
    if (confidence >= 0.5) return { dotColor: 'bg-green-500', opacity: '', border: '' };
    if (confidence >= 0.2) return { dotColor: 'bg-amber-500', opacity: 'opacity-70', border: 'border-dashed' };
    return { dotColor: 'bg-red-500', opacity: 'opacity-40', border: 'border-dashed' };
  };

  const renderConfidenceDot = (confidence: number) => {
    const { dotColor } = getConfidenceIndicator(confidence);
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-[10px]">
            {confidence < 0.2 ? t('candidateHero.notEnoughData', 'Not enough data') : confidence < 0.5 ? t('candidateHero.partialData', 'Partial data') : t('candidateHero.highConfidence', 'High confidence')}
            {' '}({Math.round(confidence * 100)}%)
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderDimensionCard = (dim: typeof DIMENSION_CONFIG[number]) => {
    const data: AssessmentDimension | null = breakdown?.[dim.key as keyof typeof breakdown] as AssessmentDimension | null;
    const hasData = data && data.confidence > 0.1;
    const score = hasData ? data.score : 0;
    const scoreColor = hasData ? getScoreColor(score) : null;
    const Icon = dim.icon;
    const ci = hasData ? getConfidenceIndicator(data.confidence) : null;

    return (
      <TooltipProvider key={dim.key}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`bg-card/60 backdrop-blur border border-border/30 rounded-xl p-2.5 transition-all hover:border-primary/30 ${ci?.opacity || ''} ${ci?.border || ''}`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground truncate">{dim.label}</span>
                {hasData && renderConfidenceDot(data.confidence)}
              </div>
              {hasData ? (
                <div className="text-xl font-bold" style={{ color: scoreColor?.bg }}>
                  {score}
                  <span className="text-[10px] font-normal text-muted-foreground">/100</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{t('candidateHero.noData', 'No data')}</span>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-medium">{dim.label}</p>
            {data?.details && <p className="text-xs text-muted-foreground mt-1">{data.details}</p>}
            {data?.sources && data.sources.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Sources: {data.sources.join(', ')}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderRadarChart = () => {
    if (chartsLoading || !recharts || !breakdown) {
      return <Skeleton className="w-full h-[180px]" />;
    }

    const { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } = recharts;

    const radarData = DIMENSION_CONFIG.map((dim) => {
      const data = breakdown[dim.key as keyof typeof breakdown] as AssessmentDimension | undefined;
      return {
        category: dim.label,
        value: data && data.confidence > 0.1 ? data.score : 0,
      };
    });

    return (
      <ResponsiveContainer width="100%" height={180}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
          />
          <Radar
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  const aiSummary = candidate.ai_summary || candidate.executive_summary;
  const strengths = candidate.strengths as string[] | null;
  const concerns = candidate.concerns as string[] | null;

  return (
    <>
      <Card className={candidateProfileTokens.glass.card}>
        <CardContent className="p-6">
          {/* Top row: Avatar + Info + Radar */}
          <div className="flex items-start gap-4">
            <Avatar className="w-24 h-24 border-2 border-border shadow-md flex-shrink-0">
              <AvatarImage src={candidate.avatar_url} alt={candidateName} />
              <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/20 to-primary/10">
                {initials || <User className="h-10 w-10" />}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <h1 className="text-2xl font-bold mb-0.5">{candidateName}</h1>
                <p className="text-sm text-muted-foreground">
                  {candidate.current_title}
                  {candidate.current_company && ` at ${candidate.current_company}`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                {(candidate.email || candidate.contact_email) && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <a href={`mailto:${candidate.email || candidate.contact_email}`} className="hover:text-foreground transition-colors text-xs">
                      {candidate.email || candidate.contact_email}
                    </a>
                  </div>
                )}
                {(candidate.phone || candidate.phone_number || candidate.contact_phone) && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <a href={`tel:${candidate.phone || candidate.phone_number || candidate.contact_phone}`} className="hover:text-foreground transition-colors text-xs">
                      {candidate.phone || candidate.phone_number || candidate.contact_phone}
                    </a>
                  </div>
                )}
                {candidate.location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs">{candidate.location}</span>
                  </div>
                )}
                {candidate.linkedin_url && (
                  <Button variant="ghost" size="sm" asChild className="h-auto py-0 px-1.5 text-xs">
                    <a href={ensureHttpsUrl(candidate.linkedin_url) || '#'} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="w-3.5 h-3.5 mr-1" />
                      LinkedIn
                    </a>
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {!hasAccount ? (
                  <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 bg-yellow-500/10 text-[10px]">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {t('candidateHero.pendingSetup', 'Pending Setup')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-green-500/50 text-green-600 bg-green-500/10 text-[10px]">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {t('candidateHero.activeMember', 'Active Member')}
                  </Badge>
                )}
                {stage && (
                  <Badge className="bg-primary/10 border-primary/30 text-primary px-2 py-0.5 text-[10px]">
                    📍 {stage}
                  </Badge>
                )}
                {candidate.years_of_experience && (
                  <Badge variant="outline" className="text-[10px]">{candidate.years_of_experience}{t('candidateHero.yrsExp', 'y exp')}</Badge>
                )}
                {candidate.notice_period && (
                  <Badge variant="outline" className="text-[10px]">{t('candidateHero.notice', 'Notice')}: {candidate.notice_period}</Badge>
                )}
              </div>

              {/* Action buttons - compact */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {hasAccount ? (
                  <Button size="sm" className="h-7 text-xs" onClick={() => navigate(`/profile/${candidate.user_id}`)}>
                    <User className="w-3.5 h-3.5 mr-1" />
                    {t('candidateHero.clubProfile', 'Club Profile')}
                  </Button>
                ) : isAdmin ? (
                  <Button size="sm" className="h-7 text-xs" onClick={() => navigate(`/admin/invite?email=${encodeURIComponent(candidate.email || '')}&name=${encodeURIComponent(candidate.full_name || '')}`)}>
                    <Send className="w-3.5 h-3.5 mr-1" />
                    {t('candidateHero.invite', 'Invite')}
                  </Button>
                ) : null}

                {onMessage && (
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onMessage}>
                    <Send className="w-3.5 h-3.5 mr-1" />
                    {t('candidateHero.message', 'Message')}
                  </Button>
                )}
                {onSchedule && (
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onSchedule}>
                    <Calendar className="w-3.5 h-3.5 mr-1" />
                    {t('candidateHero.schedule', 'Schedule')}
                  </Button>
                )}
                {onEdit && (
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onEdit}>
                    <Edit className="w-3.5 h-3.5 mr-1" />
                    {t('common:actions.edit', 'Edit')}
                  </Button>
                )}
                {isAdmin && candidate.linkedin_url && (
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEnrichModal({ open: true, mode: 'linkedin' })}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    {t('candidateHero.sync', 'Sync')}
                  </Button>
                )}
                {isAdmin && (
                  <Button variant="outline" size="sm" className="h-7 text-xs border-primary/30 hover:border-primary/60" onClick={() => setEnrichModal({ open: true, mode: 'deep-enrich' })}>
                    <Scan className="w-3.5 h-3.5 mr-1" />
                    {t('candidateHero.enrich', 'Enrich')}
                  </Button>
                )}
                {isAdmin && (
                  <Button variant="outline" size="sm" className="h-7 text-xs border-primary/30 hover:border-primary/60" onClick={() => setAddToJobOpen(true)}>
                    <Briefcase className="w-3.5 h-3.5 mr-1" />
                    {t('candidateHero.addToJob', 'Add to Job')}
                  </Button>
                )}
              </div>
            </div>

            {/* Radar Chart on the right */}
            {breakdown && (
              <div className="hidden lg:block flex-shrink-0 w-[220px]">
                {renderRadarChart()}
              </div>
            )}
          </div>

          {/* Assessment Dimension Cards Row — always visible */}
          <div className="mt-4 pt-4 border-t border-border/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">{t('candidateHero.assessment', 'Assessment')}</span>
                {breakdown && (
                  <span className="text-lg font-bold" style={{ color: getScoreColor(breakdown.overall_score).bg }}>
                    {breakdown.overall_score}
                    <span className="text-[10px] font-normal text-muted-foreground">/100</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Sparkles className="w-3 h-3" />
                  QUIN
                  {breakdown?.computed_at && (
                    <span className="text-muted-foreground/60 ml-1">· {formatRelativeTime(breakdown.computed_at)}</span>
                  )}
                </span>
                {onRecompute && (
                  <Button variant="ghost" size="sm" onClick={onRecompute} disabled={isComputing} className="h-6 text-[10px] px-2">
                    <RefreshCw className={`w-3 h-3 mr-0.5 ${isComputing ? 'animate-spin' : ''}`} />
                    {isComputing ? t('candidateHero.computing', 'Computing...') : breakdown ? t('candidateHero.refresh', 'Refresh') : t('candidateHero.compute', 'Compute')}
                  </Button>
                )}
              </div>
            </div>
            {assessmentLoading ? (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {DIMENSION_CONFIG.map(renderDimensionCard)}
              </div>
            )}
          </div>

          {/* AI Summary - collapsible */}
          {aiSummary && (
            <div className="mt-3 pt-3 border-t border-border/30">
              <button
                onClick={() => setSummaryExpanded(!summaryExpanded)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
              >
                <Sparkles className="w-3 h-3" />
                <span className="font-medium">{t('candidateHero.aiSummary', 'AI Summary')}</span>
                <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${summaryExpanded ? 'rotate-180' : ''}`} />
              </button>
              {summaryExpanded && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-muted-foreground leading-relaxed">{aiSummary}</p>
                  {strengths && strengths.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {strengths.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] border-green-500/30 text-green-600 bg-green-500/5">
                          ✓ {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {concerns && concerns.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {concerns.map((c, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 bg-amber-500/5">
                          ⚠ {c}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <EnrichmentProgressModal
        open={enrichModal.open}
        onOpenChange={(open) => setEnrichModal(prev => ({ ...prev, open }))}
        mode={enrichModal.mode}
        candidateId={candidate.id}
        candidateData={candidate}
        onComplete={() => onRefresh?.()}
      />

      <AddToJobDialog
        candidateId={candidate.id}
        candidateName={candidateName}
        open={addToJobOpen}
        onOpenChange={setAddToJobOpen}
      />
    </>
  );
};
