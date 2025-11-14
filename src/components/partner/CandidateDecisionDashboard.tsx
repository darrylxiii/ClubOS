import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Target, AlertTriangle, CheckCircle2, TrendingUp, 
  Award, DollarSign, Clock, MapPin, Zap, Briefcase, Activity, Star
} from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { candidateProfileTokens, getScoreColor } from "@/config/candidate-profile-tokens";
import { EditableSection } from "@/components/candidate-profile/EditableSection";
import { useFieldPermissions } from "@/hooks/useFieldPermissions";
import { OverallAssessmentEditor } from "@/components/partner/edit/OverallAssessmentEditor";

interface Props {
  candidate: any;
  applications?: any[];
}

export const CandidateDecisionDashboard = ({ candidate, applications }: Props) => {
  const { canEditField } = useFieldPermissions();
  
  // Early return if no candidate data
  if (!candidate) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No candidate data available
        </CardContent>
      </Card>
    );
  }

  // Calculate overall assessment score (0-100)
  const calculateOverallScore = () => {
    const scores = [
      candidate.engagement_score ? candidate.engagement_score * 10 : 0,
      candidate.fit_score ? candidate.fit_score * 10 : 0,
      candidate.internal_rating ? candidate.internal_rating * 10 : 0,
      candidate.profile_completeness || 0
    ].filter(s => s > 0);
    
    return scores.length > 0 
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
  };

  const overallScore = calculateOverallScore();
  
  // Radar chart data for skills match visualization
  const radarData = [
    { category: 'Skills Match', value: candidate.fit_score ? candidate.fit_score * 10 : 0 },
    { category: 'Experience', value: candidate.years_of_experience ? Math.min(candidate.years_of_experience * 10, 100) : 0 },
    { category: 'Engagement', value: candidate.engagement_score ? candidate.engagement_score * 10 : 0 },
    { category: 'Culture Fit', value: candidate.internal_rating ? candidate.internal_rating * 10 : 0 },
    { category: 'Salary Match', value: 80 },
    { category: 'Location', value: 70 },
  ];

  // Score badges component
  const ScoreBadge = ({ label, value, max = 10, icon: Icon }: any) => {
    const percentage = (value / max) * 100;
    const color = getScoreColor(percentage);
    
    return (
      <div className={`${candidateProfileTokens.glass.card} rounded-xl p-3`}>
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4" style={{ color: color.bg }} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="text-2xl font-bold" style={{ color: color.bg }}>
          {max === 10 ? value.toFixed(1) : `${Math.round(percentage)}%`}
        </div>
      </div>
    );
  };

  const fitScore = candidate.fit_score || 0;
  const engagementScore = candidate.engagement_score || 0;
  const internalRating = candidate.internal_rating || 0;
  const completeness = candidate.profile_completeness || 0;

  const canEdit = canEditField('internal_rating') || canEditField('fit_score') || canEditField('engagement_score');

  return (
    <div className="space-y-4">
      {/* Overall Assessment Card - Enhanced with Score Badges */}
      <EditableSection
        title="Overall Assessment"
        icon={Target}
        candidateId={candidate.id}
        sectionName="overall_assessment"
        canEdit={canEdit}
        editComponent={<OverallAssessmentEditor candidate={candidate} />}
        onSave={async () => {
          // Save logic will be implemented
          console.log('Saving overall assessment...');
        }}
      >
        <div className="space-y-4">
          {/* Top Section: Overall Score + Score Badges + Radar Chart */}
          <div className="grid grid-cols-[auto_1fr_300px] gap-6 items-start">
            {/* Overall Score - Large */}
            <div className="text-center">
              <div className="text-6xl font-black mb-2">{overallScore}</div>
              <p className="text-sm text-muted-foreground">Overall</p>
            </div>

            {/* Score Badges Grid - 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              <ScoreBadge label="Fit Score" value={fitScore} icon={TrendingUp} />
              <ScoreBadge label="Engagement" value={engagementScore} icon={Activity} />
              <ScoreBadge label="Internal Rating" value={internalRating} icon={Star} />
              <ScoreBadge label="Completeness" value={completeness} max={100} icon={CheckCircle2} />
            </div>

            {/* Radar Chart - Right side */}
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis 
                    dataKey="category" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <Radar 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.3} 
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Summary + Strengths - Side by side */}
          {(candidate.ai_summary || (candidate.ai_strengths && candidate.ai_strengths.length > 0)) && (
            <>
              <Separator className="my-4" />
              <div className="grid grid-cols-2 gap-4">
                {/* AI Summary */}
                {candidate.ai_summary && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-sm">
                      <Zap className="w-4 h-4" />
                      Executive Summary
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-4">{candidate.ai_summary}</p>
                  </div>
                )}

                {/* Strengths */}
                {candidate.ai_strengths && candidate.ai_strengths.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      Key Strengths
                    </h4>
                    <ul className="space-y-1">
                      {candidate.ai_strengths.slice(0, 3).map((s: any, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{typeof s === 'string' ? s : s.point || s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Red Flags - Full width if exists */}
          {candidate.ai_concerns && candidate.ai_concerns.length > 0 && (
            <>
              <Separator className="my-4" />
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">Potential Concerns:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {candidate.ai_concerns.map((c: any, i: number) => (
                      <li key={i}>{typeof c === 'string' ? c : c.point || c}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>
      </EditableSection>

      {/* Personality Insights */}
      {candidate.personality_insights && typeof candidate.personality_insights === 'object' && (
        <EditableSection
          title="Personality & Work Style"
          icon={Award}
          candidateId={candidate.id}
          sectionName="personality"
          canEdit={canEditField('personality_insights')}
          onSave={async () => {
            console.log('Saving personality insights...');
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(candidate.personality_insights).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <p className="text-xs uppercase text-muted-foreground tracking-wide">{key.replace(/_/g, ' ')}</p>
                <p className="text-sm font-medium">{String(value)}</p>
              </div>
            ))}
          </div>
        </EditableSection>
      )}

      {/* Quick Facts Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Years of Experience */}
        {candidate.years_of_experience && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Briefcase className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{candidate.years_of_experience}</p>
                <p className="text-xs text-muted-foreground">Years Exp</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Salary Range */}
        {candidate.desired_salary_min && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <DollarSign className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-lg font-bold">
                  {candidate.preferred_currency || 'EUR'} {Math.round(candidate.desired_salary_min / 1000)}K-{Math.round(candidate.desired_salary_max / 1000)}K
                </p>
                <p className="text-xs text-muted-foreground">Salary Range</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notice Period */}
        {candidate.notice_period && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-lg font-bold">{candidate.notice_period}</p>
                <p className="text-xs text-muted-foreground">Notice Period</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Location Preference */}
        {candidate.desired_locations?.[0] && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <MapPin className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-lg font-bold">{candidate.desired_locations[0]}</p>
                <p className="text-xs text-muted-foreground">
                  {candidate.remote_preference === 'remote_only' ? 'Remote Preferred' : 'Location'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
