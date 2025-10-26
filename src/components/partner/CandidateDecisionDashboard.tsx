import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Target, AlertTriangle, CheckCircle2, TrendingUp, 
  Award, DollarSign, Clock, MapPin, Zap, Briefcase
} from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface Props {
  candidate: any;
  applications?: any[];
}

export const CandidateDecisionDashboard = ({ candidate, applications }: Props) => {
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

  return (
    <div className="space-y-6">
      {/* Overall Assessment Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Overall Assessment
          </CardTitle>
          <CardDescription>Comprehensive evaluation across all criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-6xl font-black mb-2">{overallScore}</div>
              <p className="text-sm text-muted-foreground">Overall Score</p>
            </div>
            <Separator orientation="vertical" className="h-24" />
            <div className="flex-1">
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis 
                    dataKey="category" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <Radar 
                    dataKey="value" 
                    stroke="hsl(var(--foreground))" 
                    fill="hsl(var(--muted))" 
                    fillOpacity={0.6} 
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Summary */}
        {candidate.ai_summary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                AI Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {candidate.ai_summary}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Strengths */}
        {candidate.ai_strengths && Array.isArray(candidate.ai_strengths) && candidate.ai_strengths.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                Key Strengths
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {candidate.ai_strengths.map((strength: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{typeof strength === 'string' ? strength : strength.point || strength}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Red Flags / Concerns */}
      {candidate.ai_concerns && Array.isArray(candidate.ai_concerns) && candidate.ai_concerns.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription>
            <p className="font-semibold mb-2">Potential Concerns:</p>
            <ul className="list-disc list-inside space-y-1">
              {candidate.ai_concerns.map((concern: any, idx: number) => (
                <li key={idx} className="text-sm">
                  {typeof concern === 'string' ? concern : concern.point || concern}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Personality Insights */}
      {candidate.personality_insights && typeof candidate.personality_insights === 'object' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Personality & Work Style
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(candidate.personality_insights).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <p className="text-xs uppercase text-muted-foreground tracking-wide">{key.replace(/_/g, ' ')}</p>
                  <p className="text-sm font-medium">{String(value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
