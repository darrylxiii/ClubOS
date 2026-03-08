/**
 * Job Interview Recordings Panel
 * 
 * Displays all interview recordings for a specific job,
 * showing candidate performance, recommendations, and playback links.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { Video, Play, ChevronRight, Star, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface JobInterviewRecordingsPanelProps {
  jobId: string;
}

interface InterviewRecording {
  id: string;
  recording_id: string;
  meeting_id: string;
  candidate_name: string;
  candidate_id: string | null;
  interview_stage: string;
  overall_score: string;
  recommendation: string;
  created_at: string;
}

export function JobInterviewRecordingsPanel({ jobId }: JobInterviewRecordingsPanelProps) {
  const [recordings, setRecordings] = useState<InterviewRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecordings();
  }, [jobId]);

  const fetchRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('job_interview_recordings')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecordings((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching job interview recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadge = (score: string) => {
    if (!score || score === 'pending') return <Badge variant="outline">Pending</Badge>;
    const numScore = parseFloat(score);
    if (isNaN(numScore)) {
      // String-based score
      if (score.toLowerCase().includes('strong') || score.toLowerCase().includes('excellent'))
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Strong</Badge>;
      if (score.toLowerCase().includes('good'))
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Good</Badge>;
      return <Badge variant="outline">{score}</Badge>;
    }
    if (numScore >= 0.8) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{Math.round(numScore * 100)}%</Badge>;
    if (numScore >= 0.6) return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">{Math.round(numScore * 100)}%</Badge>;
    return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">{Math.round(numScore * 100)}%</Badge>;
  };

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case 'strong_yes':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Strong Hire</Badge>;
      case 'yes':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Proceed</Badge>;
      case 'maybe':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Consider</Badge>;
      case 'no':
      case 'strong_no':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Pass</Badge>;
      default:
        return rec && rec !== 'pending' ? <Badge variant="outline">{rec}</Badge> : null;
    }
  };

  if (loading) {
    return (
      <Card className="border-2 border-border/40 backdrop-blur-xl bg-gradient-to-br from-card/90 to-card/60">
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (recordings.length === 0) {
    return (
      <Card className="border-2 border-dashed border-border/40">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No interview recordings yet</p>
          <p className="text-xs mt-1">Recordings will appear here after interviews are analyzed</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-border/40 backdrop-blur-xl bg-gradient-to-br from-card/90 to-card/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-black uppercase text-sm flex items-center gap-2">
          <Video className="w-4 h-4 text-primary" />
          Interview Recordings ({recordings.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recordings.map((rec) => (
          <div
            key={rec.id}
            className="flex items-center justify-between p-3 rounded-lg border border-border/30 hover:bg-muted/30 transition-colors cursor-pointer"
            onClick={() => navigate(`/recording/${rec.recording_id}`)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{rec.candidate_name}</p>
                <p className="text-xs text-muted-foreground">
                  {rec.interview_stage} · {format(new Date(rec.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {getScoreBadge(rec.overall_score)}
              {getRecommendationBadge(rec.recommendation)}
              <Play className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
