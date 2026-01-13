import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import {
  FlaskConical,
  Trophy,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Copy,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { aiService } from '@/services/aiService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notify } from '@/lib/notify';

interface ABTestVariant {
  id: string;
  campaign_id: string;
  variant_type: string;
  variant_name: string;
  content: string;
  sends: number;
  opens: number;
  replies: number;
  open_rate: number;
  reply_rate: number;
  is_winner: boolean;
  statistical_significance: number | null;
  created_at: string;
}

export function ABTestAnalyzer() {
  const queryClient = useQueryClient();
  const [subjectLine, setSubjectLine] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedVariants, setGeneratedVariants] = useState<string[]>([]);

  const { data: variants, isLoading } = useQuery({
    queryKey: ['ab-test-variants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_ab_test_variants')
        .select('*')
        .order('reply_rate', { ascending: false });

      if (error) throw error;
      return data as ABTestVariant[];
    }
  });

  const generateMutation = useMutation({
    mutationFn: async (content: string) => {
      setGenerating(true);
      const { data, error } = await aiService.invokeAI('generate-ab-test-variants', {
        body: {
          original_content: content,
          variant_type: 'subject_line',
          num_variants: 5
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setGeneratedVariants(data.variants || []);
      notify.success('Variants Generated', { description: `${data.variants?.length || 0} A/B test variants created.` });
      setGenerating(false);
    },
    onError: () => {
      notify.error('Failed to generate variants');
      setGenerating(false);
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notify.success('Subject line copied to clipboard');
  };

  // Group variants by campaign
  const variantsByCampaign: Record<string, ABTestVariant[]> = {};
  variants?.forEach(v => {
    if (!variantsByCampaign[v.campaign_id]) {
      variantsByCampaign[v.campaign_id] = [];
    }
    variantsByCampaign[v.campaign_id].push(v);
  });

  // Find top performers
  const topPerformers = variants?.filter(v => v.is_winner).slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Generate Variants */}
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Subject Line Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Textarea
              placeholder="Enter your subject line to generate A/B test variants..."
              value={subjectLine}
              onChange={(e) => setSubjectLine(e.target.value)}
              className="min-h-20"
            />
          </div>
          <Button
            onClick={() => generateMutation.mutate(subjectLine)}
            disabled={generating || !subjectLine.trim()}
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Variants
              </>
            )}
          </Button>

          {/* Generated Variants */}
          {generatedVariants.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2 mt-4"
            >
              <h4 className="text-sm font-medium">Generated Variants:</h4>
              {generatedVariants.map((variant, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{String.fromCharCode(65 + index)}</Badge>
                    <span className="text-sm">{variant}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(variant)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Winning Variants
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : topPerformers.length > 0 ? (
            <div className="space-y-3">
              {topPerformers.map((variant, index) => (
                <motion.div
                  key={variant.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium">{variant.variant_name}</span>
                        {variant.statistical_significance && (
                          <Badge className="bg-green-500/10 text-green-500">
                            {variant.statistical_significance}% confidence
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate max-w-md">
                        {variant.content}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Open Rate</p>
                          <p className="text-lg font-bold text-blue-500">{variant.open_rate?.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Reply Rate</p>
                          <p className="text-lg font-bold text-green-500">{variant.reply_rate?.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No A/B test data available yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Variants by Campaign */}
      {Object.keys(variantsByCampaign).length > 0 && (
        <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              A/B Test Results by Campaign
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(variantsByCampaign).slice(0, 3).map(([campaignId, campaignVariants]) => (
                <div key={campaignId} className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Campaign: {campaignId.slice(0, 8)}...
                  </h4>
                  <div className="space-y-2">
                    {campaignVariants.map((variant, index) => {
                      const isLeading = index === 0;

                      return (
                        <div
                          key={variant.id}
                          className={`flex items-center gap-4 p-3 rounded-lg ${isLeading ? 'bg-green-500/10 border border-green-500/30' : 'bg-muted/20'}`}
                        >
                          <Badge variant={isLeading ? 'default' : 'outline'}>
                            {variant.variant_name}
                          </Badge>
                          <div className="flex-1">
                            <Progress
                              value={variant.reply_rate}
                              className="h-2"
                            />
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            {isLeading ? (
                              <TrendingUp className="w-4 h-4 text-green-500" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-500" />
                            )}
                            <span className={isLeading ? 'text-green-500' : 'text-muted-foreground'}>
                              {variant.reply_rate?.toFixed(1)}% reply
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {variant.sends} sent
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
