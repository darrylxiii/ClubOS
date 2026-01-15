import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, Star, CheckCircle2, 
  AlertTriangle, TrendingUp, FileText, Video, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';

interface Dossier {
  id: string;
  meeting_id: string;
  content: {
    candidate_name?: string;
    role_title?: string;
    meeting_date?: string;
    duration_minutes?: number;
    overall_score?: number;
    recommendation?: 'strong_hire' | 'hire' | 'no_hire' | 'needs_more_info';
    executive_summary?: string;
    strengths?: string[];
    concerns?: string[];
    key_moments?: Array<{
      timestamp: string;
      description: string;
      sentiment: 'positive' | 'neutral' | 'negative';
    }>;
    skills_assessment?: Array<{
      skill: string;
      rating: number;
      notes?: string;
    }>;
    interviewer_notes?: string;
    next_steps?: string[];
  };
  share_token: string;
  expires_at: string;
  view_count: number;
  created_at: string;
}

export default function DossierView() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shareToken) {
      loadDossier();
    }
  }, [shareToken]);

  const loadDossier = async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('meeting_dossiers')
        .select('*')
        .eq('share_token', shareToken)
        .single();

      if (dbError) throw dbError;

      if (!data) {
        setError('Dossier not found or has expired.');
        return;
      }

      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError('This dossier link has expired.');
        return;
      }

      setDossier(data as unknown as Dossier);

      // Increment view count
      await supabase
        .from('meeting_dossiers')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', data.id);
    } catch (err) {
      console.error('Error loading dossier:', err);
      setError('Failed to load dossier.');
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationBadge = (recommendation?: string) => {
    switch (recommendation) {
      case 'strong_hire':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Strong Hire</Badge>;
      case 'hire':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Hire</Badge>;
      case 'no_hire':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">No Hire</Badge>;
      case 'needs_more_info':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Needs More Info</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card className="max-w-md w-full text-center p-8">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">{error || 'Dossier not found.'}</p>
        </Card>
      </div>
    );
  }

  const content = dossier.content;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-primary">The Quantum Club</span>
                </div>
                <CardTitle className="text-2xl mb-1">
                  {content.candidate_name || 'Candidate'} — {content.role_title || 'Interview'}
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {content.meeting_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(content.meeting_date), 'MMM d, yyyy')}
                    </span>
                  )}
                  {content.duration_minutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {content.duration_minutes} minutes
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                {getRecommendationBadge(content.recommendation)}
                {content.overall_score !== undefined && (
                  <div className="mt-2 text-3xl font-bold text-primary">
                    {content.overall_score}%
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Executive Summary */}
        {content.executive_summary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{content.executive_summary}</p>
            </CardContent>
          </Card>
        )}

        {/* Strengths & Concerns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {content.strengths && content.strengths.length > 0 && (
            <Card className="border-green-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {content.strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {content.concerns && content.concerns.length > 0 && (
            <Card className="border-amber-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                  Areas of Concern
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {content.concerns.map((concern, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                      {concern}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Skills Assessment */}
        {content.skills_assessment && content.skills_assessment.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Skills Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {content.skills_assessment.map((skill, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{skill.skill}</span>
                    <span className="text-sm text-muted-foreground">{skill.rating}/10</span>
                  </div>
                  <Progress value={skill.rating * 10} className="h-2" />
                  {skill.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{skill.notes}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Key Moments */}
        {content.key_moments && content.key_moments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Key Interview Moments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {content.key_moments.map((moment, i) => (
                  <div 
                    key={i} 
                    className={`p-3 rounded-lg border ${
                      moment.sentiment === 'positive' 
                        ? 'bg-green-500/5 border-green-500/20' 
                        : moment.sentiment === 'negative'
                        ? 'bg-red-500/5 border-red-500/20'
                        : 'bg-muted/50 border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{moment.timestamp}</Badge>
                    </div>
                    <p className="text-sm">{moment.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        {content.next_steps && content.next_steps.length > 0 && (
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Recommended Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {content.next_steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground py-4">
          <p>Generated by The Quantum Club • Confidential</p>
          <p className="mt-1">This link expires {dossier.expires_at ? format(new Date(dossier.expires_at), 'MMM d, yyyy') : 'never'}</p>
        </div>
      </div>
    </div>
  );
}
