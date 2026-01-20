import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, CheckCircle2, AlertCircle, Globe, Languages, TrendingUp, Shield, Star, AlertTriangle } from 'lucide-react';
import { useTranslationCoverage } from '@/hooks/use-translation-coverage';
import { useTranslationsNeedingReview, useMarkAsReviewed } from '@/hooks/use-translation-editor';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function TranslationCoverage() {
  const { data: coverage, isLoading, refetch } = useTranslationCoverage();
  const { data: needsReviewList } = useTranslationsNeedingReview();
  const markAsReviewed = useMarkAsReviewed();
  const [selectedTab, setSelectedTab] = useState('overview');

  const handleRefresh = async () => {
    toast.loading('Refreshing coverage data...');
    await refetch();
    toast.dismiss();
    toast.success('Coverage data refreshed');
  };

  const handleMarkReviewed = async (id: string) => {
    try {
      await markAsReviewed.mutateAsync({ id });
      toast.success('Marked as reviewed');
    } catch (error) {
      toast.error('Failed to mark as reviewed');
    }
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-500';
    if (percentage >= 70) return 'text-yellow-500';
    if (percentage >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const getQualityColor = (score: number | undefined) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 90) return 'text-green-500';
    if (score >= 70) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 90) return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Complete</Badge>;
    if (percentage >= 70) return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Good</Badge>;
    if (percentage >= 50) return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">Partial</Badge>;
    return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Needs Work</Badge>;
  };

  const getQualityBadge = (score: number | undefined) => {
    if (!score) return <Badge variant="outline" className="text-xs">No data</Badge>;
    if (score >= 90) return <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs"><Star className="h-3 w-3 mr-1" />{score}</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 text-xs">{score}</Badge>;
    return <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />{score}</Badge>;
  };

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin']}>
        <div className="container mx-auto py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Globe className="h-8 w-8 text-primary" />
                Translation Coverage
              </h1>
              <p className="text-muted-foreground mt-1">
                Monitor translation completeness and quality across all languages
              </p>
            </div>
            <Button onClick={handleRefresh} variant="outline" className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="glass-strong">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Overall Coverage</p>
                      <p className={`text-3xl font-bold ${getStatusColor(coverage?.overallCompletion || 0)}`}>
                        {coverage?.overallCompletion?.toFixed(1) || 0}%
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary/50" />
                  </div>
                  <Progress value={coverage?.overallCompletion || 0} className="mt-4" />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="glass-strong">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Quality</p>
                      <p className={`text-3xl font-bold ${getQualityColor(coverage?.qualitySummary?.averageQuality)}`}>
                        {coverage?.qualitySummary?.averageQuality || 0}
                      </p>
                    </div>
                    <Star className="h-8 w-8 text-yellow-500/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">Quality score (0-100)</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="glass-strong">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Validated</p>
                      <p className="text-3xl font-bold text-green-500">
                        {coverage?.qualitySummary?.validated || 0}
                      </p>
                    </div>
                    <Shield className="h-8 w-8 text-green-500/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">Human reviewed</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card className="glass-strong">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Needs Review</p>
                      <p className="text-3xl font-bold text-yellow-500">
                        {coverage?.qualitySummary?.needsReview || 0}
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-yellow-500/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">Quality warnings</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="glass-strong">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Missing Keys</p>
                      <p className="text-3xl font-bold text-red-500">
                        {coverage?.missingKeys?.length || 0}
                      </p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-red-500/50" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">Keys missing translations</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Detailed Tabs */}
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4 max-w-lg">
              <TabsTrigger value="overview">By Language</TabsTrigger>
              <TabsTrigger value="namespace">By Namespace</TabsTrigger>
              <TabsTrigger value="review">
                Needs Review
                {(needsReviewList?.length || 0) > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center">
                    {needsReviewList?.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="missing">Missing Keys</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Coverage by Language</CardTitle>
                  <CardDescription>Translation completeness and quality for each supported language</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(coverage?.byLanguage || {}).map(([lang, data]) => (
                      <div key={lang} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                        <div className="w-12 text-center">
                          <span className="text-2xl">{getLanguageFlag(lang)}</span>
                          <p className="text-xs font-medium uppercase mt-1">{lang}</p>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{getLanguageName(lang)}</span>
                            <div className="flex items-center gap-2">
                              {getQualityBadge((data as any).qualityScore)}
                              {getStatusBadge((data as any).percentage || 0)}
                            </div>
                          </div>
                          <Progress value={(data as any).percentage || 0} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{(data as any).translated || 0} / {(data as any).total || 0} keys</span>
                            <span className={getStatusColor((data as any).percentage || 0)}>
                              {((data as any).percentage || 0).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="namespace" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Coverage by Namespace</CardTitle>
                  <CardDescription>Translation completeness for each namespace across all languages</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(coverage?.byNamespace || {}).map(([ns, data]) => (
                      <div key={ns} className="p-4 rounded-lg bg-muted/50 border">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium capitalize">{ns}</span>
                          {getStatusBadge((data as any).percentage || 0)}
                        </div>
                        <Progress value={(data as any).percentage || 0} className="h-2 mb-2" />
                        <p className="text-xs text-muted-foreground">
                          {(data as any).translated || 0} / {(data as any).total || 0} translations complete
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="review" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Translations Needing Review</CardTitle>
                  <CardDescription>Translations with quality warnings that need human review</CardDescription>
                </CardHeader>
                <CardContent>
                  {(needsReviewList || []).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p>All translations have been reviewed!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(needsReviewList || []).map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-yellow-500/30">
                          <div className="flex items-center gap-4">
                            <span className="text-2xl">{getLanguageFlag(item.language)}</span>
                            <div>
                              <p className="font-medium">{item.namespace}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">{item.language.toUpperCase()}</Badge>
                                {item.translation_provider && (
                                  <Badge variant="secondary" className="text-xs">
                                    {item.translation_provider === 'google' ? '🌐 Google' : '🤖 AI'}
                                  </Badge>
                                )}
                                {item.quality_score && (
                                  <Badge className="bg-yellow-500/20 text-yellow-600 text-xs">
                                    Score: {item.quality_score}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleMarkReviewed(item.id)}
                            disabled={markAsReviewed.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Mark Reviewed
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="missing" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Missing Translation Keys</CardTitle>
                  <CardDescription>Keys that need translations in one or more languages</CardDescription>
                </CardHeader>
                <CardContent>
                  {(coverage?.missingKeys || []).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p>All translations are complete!</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {(coverage?.missingKeys || []).slice(0, 50).map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                          <div>
                            <code className="text-xs bg-background px-2 py-1 rounded">{item.namespace}:{item.key}</code>
                          </div>
                          <div className="flex gap-1">
                            {item.missingIn?.map((lang: string) => (
                              <Badge key={lang} variant="outline" className="text-xs">
                                {lang}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                      {(coverage?.missingKeys || []).length > 50 && (
                        <p className="text-center text-muted-foreground text-sm py-4">
                          And {(coverage?.missingKeys || []).length - 50} more...
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </RoleGate>
    </AppLayout>
  );
}

// Helper functions
function getLanguageFlag(code: string): string {
  const flags: Record<string, string> = {
    en: '🇬🇧',
    nl: '🇳🇱',
    de: '🇩🇪',
    fr: '🇫🇷',
    es: '🇪🇸',
    zh: '🇨🇳',
    ar: '🇸🇦',
    ru: '🇷🇺',
  };
  return flags[code] || '🌐';
}

function getLanguageName(code: string): string {
  const names: Record<string, string> = {
    en: 'English',
    nl: 'Dutch',
    de: 'German',
    fr: 'French',
    es: 'Spanish',
    zh: 'Chinese',
    ar: 'Arabic',
    ru: 'Russian',
  };
  return names[code] || code;
}
