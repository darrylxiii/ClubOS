import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Eye, MessageSquare, UserPlus, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface TalentMatch {
  id: string;
  candidate_id: string;
  job_id: string;
  match_score: number;
  match_factors: any;
  status: string;
  candidate?: {
    id: string;
    full_name: string;
    title: string;
    avatar_url: string;
    skills: string[];
    years_of_experience: number;
  };
  job?: {
    title: string;
  };
}

export function TalentRecommendations({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();

  const { data: matches, isLoading } = useQuery({
    queryKey: ['talent-matches', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('talent_matches' as any)
        .select(`
          *,
          candidate:candidate_profiles!talent_matches_candidate_id_fkey(
            id,
            full_name,
            title,
            avatar_url,
            skills,
            years_of_experience
          ),
          job:jobs!talent_matches_job_id_fkey(
            title
          )
        `)
        .eq('company_id', companyId)
        .in('status', ['pending', 'viewed'])
        .order('match_score', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as unknown as TalentMatch[];
    },
    refetchInterval: 120000 // Refresh every 2 minutes
  });

  const updateMatchStatus = useMutation({
    mutationFn: async ({ matchId, status }: { matchId: string; status: string }) => {
      const updates: any = { status };
      if (status === 'viewed') updates.viewed_at = new Date().toISOString();
      if (status === 'contacted') updates.contacted_at = new Date().toISOString();

      const { error } = await supabase
        .from('talent_matches' as any)
        .update(updates)
        .eq('id', matchId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['talent-matches', companyId] });
    }
  });

  const handleViewCandidate = (match: TalentMatch) => {
    if (match.status === 'pending') {
      updateMatchStatus.mutate({ matchId: match.id, status: 'viewed' });
    }
  };

  const handleContact = (match: TalentMatch) => {
    updateMatchStatus.mutate({ matchId: match.id, status: 'contacted' });
    toast.success('Candidate contacted');
  };

  const handleShortlist = (match: TalentMatch) => {
    updateMatchStatus.mutate({ matchId: match.id, status: 'shortlisted' });
    toast.success('Candidate shortlisted');
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/20">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4">
                <div className="h-16 w-16 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          AI-Powered Talent Matches
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(!matches || matches.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No talent matches yet</p>
            <p className="text-sm">Publish your jobs to get AI-powered candidate recommendations</p>
          </div>
        )}

        {matches && matches.map((match) => (
          <div 
            key={match.id}
            className="p-4 rounded-lg border border-border/40 hover:border-accent/40 transition-colors"
          >
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14 border-2 border-accent/30">
                <AvatarImage src={match.candidate?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-accent to-purple-500 text-white font-bold">
                  {match.candidate?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold">{match.candidate?.full_name}</h4>
                    <p className="text-sm text-muted-foreground">{match.candidate?.title}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-accent/30"
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {Math.round(match.match_score * 100)}% Match
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {match.match_factors?.skills_match?.slice(0, 4).map((skill: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {match.match_factors?.skills_match?.length > 4 && (
                    <Badge variant="secondary" className="text-xs">
                      +{match.match_factors.skills_match.length - 4}
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  For: <span className="font-medium">{match.job?.title}</span>
                  {match.candidate?.years_of_experience && (
                    <> • {match.candidate.years_of_experience} years experience</>
                  )}
                </p>

                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewCandidate(match)}
                    asChild
                  >
                    <Link to={`/candidates/${match.candidate_id}`}>
                      <Eye className="h-3 w-3 mr-1" />
                      View Profile
                    </Link>
                  </Button>
                  
                  {match.status !== 'contacted' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleContact(match)}
                      disabled={updateMatchStatus.isPending}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Contact
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleShortlist(match)}
                    disabled={updateMatchStatus.isPending || match.status === 'shortlisted'}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    {match.status === 'shortlisted' ? 'Shortlisted' : 'Shortlist'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
