import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, ExternalLink, X, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface ShortlistedCandidate {
  id: string;
  candidate_id: string;
  job_id: string | null;
  priority: number;
  notes: string | null;
  created_at: string;
  candidate: {
    id: string;
    full_name: string;
    title: string | null;
    avatar_url: string | null;
  } | null;
  job: {
    title: string;
  } | null;
}

export function CandidateShortlistWidget({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();

  const { data: shortlist, isLoading } = useQuery({
    queryKey: ['candidate-shortlist', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_shortlists' as any)
        .select(`
          id,
          candidate_id,
          job_id,
          priority,
          notes,
          created_at,
          candidate:candidate_profiles!candidate_shortlists_candidate_id_fkey(
            id, full_name, title, avatar_url
          ),
          job:jobs!candidate_shortlists_job_id_fkey(title)
        `)
        .eq('company_id', companyId)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []) as unknown as ShortlistedCandidate[];
    }
  });

  const removeFromShortlist = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('candidate_shortlists' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-shortlist', companyId] });
    }
  });

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="h-4 w-4 text-amber-500" />
            Starred Candidates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card group hover:border-primary/30 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            Starred Candidates
          </div>
          <Badge variant="secondary">
            {shortlist?.length || 0}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!shortlist || shortlist.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <Users className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Star candidates from applications to access them quickly
            </p>
            <Button variant="outline" size="sm" asChild className="mt-2">
              <Link to="/company-applications">Browse Applications</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {shortlist.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group/item"
                >
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarImage src={item.candidate?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {item.candidate?.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.candidate?.full_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.candidate?.title || 'No title'} 
                      {item.job && <span className="text-primary"> • {item.job.title}</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      asChild
                    >
                      <Link to={`/candidates/${item.candidate_id}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeFromShortlist.mutate(item.id)}
                      disabled={removeFromShortlist.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
