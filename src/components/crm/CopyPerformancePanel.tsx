import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from '@/lib/motion';
import {
  Mail,
  FileText,
  BarChart3,
  Sparkles,
  TrendingUp,
  Trophy,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useCopyPerformance } from '@/hooks/useCopyPerformance';
import { cn } from '@/lib/utils';
import useRecharts from '@/hooks/useRecharts';

function getScoreBadge(rate: number, type: 'open' | 'reply') {
  const thresholds = type === 'open'
    ? { great: 50, good: 30 }
    : { great: 5, good: 2 };

  if (rate >= thresholds.great) return { label: 'Excellent', className: 'bg-green-500/10 text-green-500 border-green-500/30' };
  if (rate >= thresholds.good) return { label: 'Good', className: 'bg-blue-500/10 text-blue-500 border-blue-500/30' };
  return { label: 'Low', className: 'bg-muted text-muted-foreground border-border' };
}

export function CopyPerformancePanel() {
  const { subjectLines, bodyCopy, stepHeatmap, learnings, loading } = useCopyPerformance();
  const { recharts, isLoading: rechartsLoading } = useRecharts();
  const [tab, setTab] = useState('subjects');

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Copy Performance Intelligence
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Powered by QUIN — learnings from your outreach data
          </p>
        </div>
        {learnings.length > 0 && (
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            <Sparkles className="w-3 h-3 mr-1" />
            {learnings.length} active patterns
          </Badge>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="subjects" className="gap-1.5 text-xs">
            <Mail className="w-3.5 h-3.5" />
            Subject Lines
          </TabsTrigger>
          <TabsTrigger value="body" className="gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" />
            Body Copy
          </TabsTrigger>
          <TabsTrigger value="steps" className="gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" />
            Step Heatmap
          </TabsTrigger>
          <TabsTrigger value="learnings" className="gap-1.5 text-xs">
            <Sparkles className="w-3.5 h-3.5" />
            AI Learnings
          </TabsTrigger>
        </TabsList>

        {/* Subject Line Leaderboard */}
        <TabsContent value="subjects" className="mt-4">
          {subjectLines.length === 0 ? (
            <EmptyState icon={Mail} message="No subject line data yet. Sync your Instantly campaigns to see performance." />
          ) : (
            <div className="space-y-2">
              {subjectLines.slice(0, 15).map((s, i) => {
                const badge = getScoreBadge(s.open_rate, 'open');
                return (
                  <motion.div
                    key={`${s.campaign_id}-${s.step_number}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card className="bg-card/60 border-border/30 hover:border-border/60 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-muted-foreground w-6">#{i + 1}</span>
                              <p className="font-medium text-sm truncate">{s.subject_line}</p>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground ml-8">
                              <span>{s.campaign_name}</span>
                              <span>·</span>
                              <span>Step {s.step_number}</span>
                              <span>·</span>
                              <span>{s.sends.toLocaleString()} sent</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="text-right">
                                  <p className="text-sm font-bold">{s.open_rate.toFixed(1)}%</p>
                                  <p className="text-xs text-muted-foreground">opens</p>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>{s.opens} opens from {s.sends} sent</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger>
                                <div className="text-right">
                                  <p className="text-sm font-bold">{s.reply_rate.toFixed(1)}%</p>
                                  <p className="text-xs text-muted-foreground">replies</p>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>{s.replies} replies</TooltipContent>
                            </Tooltip>
                            <Badge variant="outline" className={badge.className}>
                              {badge.label}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Body Copy Leaderboard */}
        <TabsContent value="body" className="mt-4">
          {bodyCopy.length === 0 ? (
            <EmptyState icon={FileText} message="No body copy data yet. Sync sequence steps with body content to see performance." />
          ) : (
            <div className="space-y-2">
              {bodyCopy.slice(0, 10).map((b, i) => {
                const badge = getScoreBadge(b.reply_rate, 'reply');
                return (
                  <motion.div
                    key={`${b.campaign_id}-${b.step_number}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card className="bg-card/60 border-border/30 hover:border-border/60 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2 mb-1">
                              <span className="text-xs font-mono text-muted-foreground w-6 mt-0.5">#{i + 1}</span>
                              <p className="text-sm text-muted-foreground line-clamp-2">{b.body_preview}…</p>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground ml-8 mt-1">
                              <span>{b.campaign_name}</span>
                              <span>·</span>
                              <span>Step {b.step_number}</span>
                              <span>·</span>
                              <span>{b.sends.toLocaleString()} sent</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-bold">{b.reply_rate.toFixed(1)}%</p>
                              <p className="text-xs text-muted-foreground">replies</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-green-500">{b.positive_rate.toFixed(1)}%</p>
                              <p className="text-xs text-muted-foreground">positive</p>
                            </div>
                            <Badge variant="outline" className={badge.className}>
                              {badge.label}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Step Heatmap */}
        <TabsContent value="steps" className="mt-4">
          {stepHeatmap.length === 0 ? (
            <EmptyState icon={BarChart3} message="No sequence step data yet." />
          ) : (
            <div className="space-y-4">
              {!rechartsLoading && recharts ? (
                <Card className="bg-card/60 border-border/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Step-by-Step Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <recharts.ResponsiveContainer width="100%" height={280}>
                      <recharts.BarChart data={stepHeatmap}>
                        <recharts.CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <recharts.XAxis
                          dataKey="step_number"
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          tickFormatter={(v) => `Step ${v}`}
                        />
                        <recharts.YAxis
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <recharts.Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
                        />
                        <recharts.Bar dataKey="avg_open_rate" name="Open Rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        <recharts.Bar dataKey="avg_reply_rate" name="Reply Rate" fill="hsl(210 100% 60%)" radius={[4, 4, 0, 0]} />
                      </recharts.BarChart>
                    </recharts.ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : (
                <Skeleton className="h-72 w-full" />
              )}

              {/* Step Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stepHeatmap.map(step => (
                  <Card key={step.step_number} className="bg-card/60 border-border/30">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Step {step.step_number}</p>
                      <p className="text-lg font-bold">{step.avg_open_rate.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">open rate</p>
                      <div className="mt-2 pt-2 border-t border-border/30">
                        <p className="text-sm font-semibold">{step.avg_reply_rate.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">reply rate</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {step.total_sends.toLocaleString()} sends · {step.campaign_count} campaigns
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* AI Learnings */}
        <TabsContent value="learnings" className="mt-4">
          {learnings.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              message="No learnings yet. The system analyzes outreach patterns daily once you have enough data (50+ sends per campaign)."
            />
          ) : (
            <div className="space-y-3">
              {learnings.map((learning, i) => (
                <motion.div
                  key={learning.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="bg-card/60 border-border/30">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20 text-primary">
                              {learning.learning_type.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              n={learning.sample_size}
                            </Badge>
                          </div>
                          <p className="text-sm mt-2">{learning.pattern}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {learning.performance_lift !== null && (
                            <div className={cn(
                              "flex items-center gap-1 text-sm font-semibold",
                              learning.performance_lift >= 0 ? "text-green-500" : "text-red-500"
                            )}>
                              {learning.performance_lift >= 0 ? (
                                <ArrowUpRight className="w-4 h-4" />
                              ) : (
                                <ArrowDownRight className="w-4 h-4" />
                              )}
                              {Math.abs(learning.performance_lift).toFixed(1)}%
                            </div>
                          )}
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">confidence</p>
                            <p className="text-sm font-bold">{learning.confidence_score.toFixed(0)}%</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <Card className="bg-card/40 border-border/20 border-dashed">
      <CardContent className="p-12 text-center">
        <Icon className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{message}</p>
      </CardContent>
    </Card>
  );
}
