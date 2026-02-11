import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, RefreshCw, Check, Brain, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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
    onError: (error: Error) => {
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

  const getImpactColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'medium': return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
      default: return 'bg-muted';
    }
  };

  return (
    <Card className="glass-card group hover:border-primary/30 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <span>QUIN Daily Briefing</span>
            <Badge variant="secondary" className="ml-1 text-[10px]">
              AI
            </Badge>
          </div>
          <Button 
            size="sm" 
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => generateBriefing.mutate()}
            disabled={generateBriefing.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${generateBriefing.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="animate-pulse space-y-3">
            <div className="h-24 bg-muted rounded-lg" />
            <div className="h-24 bg-muted rounded-lg" />
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {!isLoading && insights && insights.length > 0 && insights.map((insight, index) => (
            <motion.div 
              key={insight.id} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-all space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <h4 className="font-semibold text-sm">{insight.title}</h4>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-7 w-7 p-0 opacity-60 hover:opacity-100 hover:bg-emerald-500/10"
                  onClick={() => markRead.mutate(insight.id)}
                  disabled={markRead.isPending}
                >
                  <Check className="h-4 w-4 text-emerald-500" />
                </Button>
              </div>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap pl-6">
                {insight.content}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6">
                <Badge variant="outline" className={`capitalize ${getImpactColor(insight.impact_level)}`}>
                  {insight.impact_level} impact
                </Badge>
                <span className="text-border">•</span>
                <span>{new Date(insight.generated_at).toLocaleDateString()}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {!isLoading && (!insights || insights.length === 0) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8 space-y-3"
          >
            <div className="inline-flex p-3 rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Your briefing awaits</p>
              <p className="text-sm text-muted-foreground">
                Let QUIN analyze your hiring activity
              </p>
            </div>
            <Button 
              variant="outline"
              onClick={() => generateBriefing.mutate()}
              disabled={generateBriefing.isPending}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Briefing
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
