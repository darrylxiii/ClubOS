import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExecutiveBriefingCard } from "@/components/intelligence/ExecutiveBriefingCard";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Users, Clock, Target } from "lucide-react";

interface ExecutiveDashboardProps {
  jobId: string;
}

export function ExecutiveDashboard({ jobId }: ExecutiveDashboardProps) {
  const [finalStageCandidates, setFinalStageCandidates] = useState<any[]>([]);

  useEffect(() => {
    loadFinalStageCandidates();
  }, [jobId]);

  const loadFinalStageCandidates = async () => {
    const { data } = await supabase
      .from('applications')
      .select('*')
      .eq('job_id', jobId)
      .eq('status', 'active')
      .gte('current_stage_index', 3)
      .order('match_score', { ascending: false })
      .limit(5);
    
    setFinalStageCandidates(data || []);
  };

  return (
    <div className="space-y-6">
      {/* Simplified View - Only final stage candidates */}
      <Card>
        <CardHeader>
          <CardTitle>Candidates Ready for Your Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {finalStageCandidates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No candidates in final stage yet
              </p>
            ) : (
              finalStageCandidates.map(candidate => (
                <div key={candidate.id} className="border rounded-lg p-4">
                  {/* One-page briefing */}
                  <ExecutiveBriefingCard 
                    candidateId={candidate.candidate_id} 
                    jobId={jobId} 
                    compact={false} 
                  />
                  
                  {/* Quick actions */}
                  <div className="flex gap-2 mt-4">
                    <Button variant="default" size="sm">
                      👍 Approve
                    </Button>
                    <Button variant="outline" size="sm">
                      👎 Decline
                    </Button>
                    <Button variant="ghost" size="sm">
                      More Info
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* High-level metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Hires This Month</p>
            <p className="text-2xl font-bold">-</p>
            <p className="text-xs text-green-500">vs last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Avg Time to Hire</p>
            <p className="text-2xl font-bold">-d</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Offer Acceptance</p>
            <p className="text-2xl font-bold">-%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Quality Score</p>
            <p className="text-2xl font-bold">-%</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
