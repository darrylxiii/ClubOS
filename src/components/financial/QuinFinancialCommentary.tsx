import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { untypedTable } from '@/lib/supabaseRpc';
import { Sparkles, RefreshCw, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function QuinFinancialCommentary() {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();

  const { data: commentaries, isLoading } = useQuery({
    queryKey: ['financial-commentaries'],
    queryFn: async () => {
      const { data, error } = await untypedTable('financial_commentaries')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as Array<{
        id: string;
        quarter: string;
        year: number;
        narrative: string;
        generated_at: string;
      }>;
    },
    staleTime: 2 * 60 * 1000,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-financial-commentary', {
        body: {
          year: new Date().getFullYear(),
          quarter: `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
        },
      });

      if (error) {
        if (error.message?.includes('429')) throw new Error('Rate limited — please try again shortly.');
        if (error.message?.includes('402')) throw new Error('AI credits exhausted — top up in Settings.');
        throw new Error(error.message || 'Failed to generate commentary');
      }
      if (!data?.success) throw new Error(data?.error || 'Generation failed');
      return data;
    },
    onSuccess: () => {
      toast.success(t("quin_financial_narrative_generated", "QUIN financial narrative generated"));
      queryClient.invalidateQueries({ queryKey: ['financial-commentaries'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const latest = commentaries?.[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            QUIN Financial Commentary
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1.5" />
            )}
            Generate New
          </Button>
        </CardTitle>
        <CardDescription>
          AI-generated quarterly narrative from live financial data — Powered by QUIN
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
        ) : !latest ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t("no_commentary_generated_yet", "No commentary generated yet.")}</p>
            <p className="text-xs mt-1">{t("click_generate_new_to", "Click ')Generate New' to create your first QUIN narrative.")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Latest commentary */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{latest.quarter} {latest.year}</Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(latest.generated_at), 'dd MMM yyyy HH:mm')}
                </span>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {latest.narrative.split('\n').map((paragraph, i) => (
                  <p key={i} className="text-sm leading-relaxed">{paragraph}</p>
                ))}
              </div>
            </div>

            {/* Historical entries */}
            {commentaries && commentaries.length > 1 && (
              <div className="border-t pt-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Previous Commentaries
                </p>
                {commentaries.slice(1).map((c) => (
                  <details key={c.id} className="group">
                    <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{c.quarter} {c.year}</Badge>
                      <span className="text-xs">{format(new Date(c.generated_at), 'dd MMM yyyy')}</span>
                    </summary>
                    <div className="mt-2 pl-4 border-l-2 border-border/50 text-sm text-muted-foreground">
                      {c.narrative.split('\n').map((p, i) => (
                        <p key={i} className="leading-relaxed">{p}</p>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
