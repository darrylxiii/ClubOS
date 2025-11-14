import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";

export function DailyBriefing({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();

  const { data: insights, isLoading } = useQuery({
    queryKey: ['daily-briefing', companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('partner_ai_insights' as any)
        .select('*')
        .eq('company_id', companyId)
        .eq('insight_type', 'daily_briefing')
        .eq('is_read', false)
        .order('generated_at', { ascending: false })
        .limit(5);
      return (data || []) as any[];
    }
  });

  const generateBriefing = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-partner-insights', {
        body: { companyId, insightType: 'daily_briefing' }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Daily briefing generated');
      queryClient.invalidateQueries({ queryKey: ['daily-briefing', companyId] });
    },
    onError: (error: any) => {
      toast.error('Failed to generate briefing', {
        description: error.message
      });
    }
  });

  const markRead = useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from('partner_ai_insights' as any)
        .update({ is_read: true })
        .eq('id', insightId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-briefing', companyId] });
    }
  });

  return (
    <Card className="border-2 border-accent/30 bg-gradient-to-br from-card to-accent/5">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            QUIN Daily Briefing
          </span>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => generateBriefing.mutate()}
            disabled={generateBriefing.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${generateBriefing.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="animate-pulse space-y-2">
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        )}

        {!isLoading && insights && insights.length > 0 && insights.map((insight) => (
          <div key={insight.id} className="p-4 rounded-lg bg-background/60 border border-border/40 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold">{insight.title}</h4>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => markRead.mutate(insight.id)}
                disabled={markRead.isPending}
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap">
              {insight.content}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="capitalize">
                {insight.impact_level} impact
              </Badge>
              <span>•</span>
              <span>{new Date(insight.generated_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}

        {!isLoading && (!insights || insights.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No new insights today</p>
            <Button 
              variant="link" 
              onClick={() => generateBriefing.mutate()}
              className="mt-2"
            >
              Generate briefing
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
