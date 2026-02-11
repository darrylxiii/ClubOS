import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sparkles, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface MatchedCandidate {
  id: string;
  full_name: string;
  avatar_url: string | null;
  current_title: string | null;
  current_company: string | null;
  match_score: number;
  match_factors: string[] | null;
  match_explanation: string | null;
}

interface MatchedCandidatesTabProps {
  jobId: string;
}

export function MatchedCandidatesTab({ jobId }: MatchedCandidatesTabProps) {
  const [matches, setMatches] = useState<MatchedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingMatches, setGeneratingMatches] = useState(false);

  useEffect(() => {
    loadMatches();
  }, [jobId]);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('talent_matches')
        .select(`
          id,
          candidate_id,
          match_score,
          match_factors,
          match_explanation,
          candidate_profiles (
            full_name,
            avatar_url,
            current_title,
            current_company
          )
        `)
        .eq('job_id', jobId)
        .order('match_score', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data) {
        const formatted = data.map((m: any) => ({
          id: m.candidate_id,
          full_name: m.candidate_profiles?.full_name || 'Unknown',
          avatar_url: m.candidate_profiles?.avatar_url,
          current_title: m.candidate_profiles?.current_title,
          current_company: m.candidate_profiles?.current_company,
          match_score: m.match_score || 0,
          match_factors: m.match_factors,
          match_explanation: m.match_explanation,
        }));
        setMatches(formatted);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewMatches = async () => {
    try {
      setGeneratingMatches(true);
      const { error } = await supabase.rpc('generate_talent_matches' as any, {
        p_job_id: jobId,
        p_limit: 20
      });
      if (error) throw error;
      await loadMatches();
      toast.success('Talent matches generated successfully!');
    } catch (error) {
      console.error('Error generating matches:', error);
      toast.error('Failed to generate matches');
    } finally {
      setGeneratingMatches(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with CTA */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          AI-Matched Candidates
        </h3>
        <Button
          onClick={generateNewMatches}
          disabled={generatingMatches || matches.length > 0}
          size="sm"
          className="gap-2"
        >
          {generatingMatches && <Loader2 className="w-4 h-4 animate-spin" />}
          {matches.length > 0 ? 'Matches Generated' : 'Generate Matches'}
        </Button>
      </div>

      {matches.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">
              No matches generated yet. Click Generate Matches to find candidates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {matches.map((candidate, idx) => (
            <motion.div
              key={candidate.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Avatar */}
                      <Avatar className="h-10 w-10 shrink-0 mt-0.5">
                        <AvatarImage src={candidate.avatar_url || ''} />
                        <AvatarFallback>
                          {candidate.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Candidate Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">
                          {candidate.full_name}
                        </h4>
                        {candidate.current_title && (
                          <p className="text-xs text-muted-foreground truncate">
                            {candidate.current_title}
                            {candidate.current_company && ` at ${candidate.current_company}`}
                          </p>
                        )}

                        {/* Match Explanation */}
                        {candidate.match_explanation && (
                          <p className="text-xs text-foreground/70 mt-1">
                            {candidate.match_explanation}
                          </p>
                        )}

                        {/* Match Factors */}
                        {candidate.match_factors && candidate.match_factors.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {candidate.match_factors.slice(0, 3).map((factor) => (
                              <Badge key={factor} variant="secondary" className="text-[10px] py-0 px-1.5">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Match Score */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {Math.round(candidate.match_score)}%
                        </div>
                        <p className="text-xs text-muted-foreground">match</p>
                      </div>
                      <Progress
                        value={candidate.match_score}
                        className="w-20 h-1.5"
                      />
                      <ChevronRight className="w-4 h-4 text-muted-foreground mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {matches.length > 0 && (
        <p className="text-xs text-muted-foreground text-center pt-4">
          Showing {matches.length} of {matches.length} matches based on AI analysis
        </p>
      )}
    </div>
  );
}
