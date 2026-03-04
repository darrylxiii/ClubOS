import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Zap,
  FileText,
  FlaskConical,
  Brain,
  Settings,
  Eye,
  Users,
  Clock,
  MousePointerClick,
  ArrowDown,
  TrendingUp,
} from 'lucide-react';
import { useBlogEngineSettings } from '@/hooks/useBlogEngineSettings';
import BlogQueueTable from '@/components/admin/BlogQueueTable';
import BlogArticleManager from '@/components/admin/BlogArticleManager';
import ABTestPanel from '@/components/admin/ABTestPanel';
import BlogLearningsPanel from '@/components/admin/BlogLearningsPanel';
import BlogEngineControlModal from '@/components/admin/BlogEngineControlModal';

const BlogEngine: React.FC = () => {
  const { settings, isLoading: settingsLoading, isEngineActive } = useBlogEngineSettings();

  // Dashboard analytics
  const { data: dashboardStats } = useQuery({
    queryKey: ['blog-dashboard-stats'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

      const [postsRes, analyticsRes, queueRes] = await Promise.all([
        supabase.from('blog_posts').select('id, status, performance_score, title, slug', { count: 'exact' }),
        supabase.from('blog_analytics' as any).select('*').gte('date', thirtyDaysAgo),
        supabase.from('blog_generation_queue').select('id, status', { count: 'exact' }),
      ]);

      const posts = postsRes.data || [];
      const analytics = (analyticsRes.data || []) as any[];
      const queue = queueRes.data || [];

      const totalViews = analytics.reduce((s: number, a: any) => s + (a.page_views || 0), 0);
      const avgScroll = analytics.length
        ? Math.round(analytics.reduce((s: number, a: any) => s + (a.scroll_depth || 0), 0) / analytics.length)
        : 0;
      const totalClicks = analytics.reduce((s: number, a: any) => s + (a.cta_clicks || 0), 0);

      const publishedPosts = posts.filter((p: any) => p.status === 'published');
      const topPosts = [...publishedPosts]
        .sort((a: any, b: any) => (b.performance_score || 0) - (a.performance_score || 0))
        .slice(0, 5);

      return {
        totalPosts: posts.length,
        published: publishedPosts.length,
        drafts: posts.filter((p: any) => p.status === 'draft').length,
        queuePending: queue.filter((q: any) => q.status === 'pending').length,
        totalViews,
        avgScroll,
        totalClicks,
        completions,
        topPosts,
      };
    },
  });

  const stats = dashboardStats;

  return (
    <>
      <Helmet>
        <title>Blog Engine | Admin</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Blog Engine</h1>
              <p className="text-muted-foreground mt-1">
                AI-powered content generation and management.
                {settings && (
                  <span className="ml-2">
                    {settings.preferred_formats?.length || 0} formats active
                  </span>
                )}
              </p>
            </div>
            <div className={`w-3 h-3 rounded-full ${isEngineActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
          </div>

          <BlogEngineControlModal />
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="queue" className="gap-2">
              <Zap className="h-4 w-4" /> Queue
              {stats?.queuePending ? (
                <Badge variant="secondary" className="ml-1 text-xs">{stats.queuePending}</Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="articles" className="gap-2">
              <FileText className="h-4 w-4" /> Articles
            </TabsTrigger>
            <TabsTrigger value="ab-tests" className="gap-2">
              <FlaskConical className="h-4 w-4" /> A/B Tests
            </TabsTrigger>
            <TabsTrigger value="learnings" className="gap-2">
              <Brain className="h-4 w-4" /> Learnings
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" /> Settings
            </TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Eye className="h-3.5 w-3.5" />
                    <span className="text-xs uppercase tracking-wide">Views (30d)</span>
                  </div>
                  <p className="text-2xl font-semibold">{stats?.totalViews ?? '—'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="text-xs uppercase tracking-wide">Published</span>
                  </div>
                  <p className="text-2xl font-semibold">{stats?.published ?? '—'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <ArrowDown className="h-3.5 w-3.5" />
                    <span className="text-xs uppercase tracking-wide">Avg Scroll</span>
                  </div>
                  <p className="text-2xl font-semibold">{stats?.avgScroll ?? '—'}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MousePointerClick className="h-3.5 w-3.5" />
                    <span className="text-xs uppercase tracking-wide">CTA Clicks</span>
                  </div>
                  <p className="text-2xl font-semibold">{stats?.totalClicks ?? '—'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="text-xs uppercase tracking-wide">Completions</span>
                  </div>
                  <p className="text-2xl font-semibold">{stats?.completions ?? '—'}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Zap className="h-3.5 w-3.5" />
                    <span className="text-xs uppercase tracking-wide">In Queue</span>
                  </div>
                  <p className="text-2xl font-semibold">{stats?.queuePending ?? '—'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Top Posts */}
            {stats?.topPosts && stats.topPosts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Performing Articles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.topPosts.map((post: any, i: number) => (
                      <div key={post.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30">
                        <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
                        <span className="flex-1 text-sm font-medium truncate">{post.title}</span>
                        <Badge variant="outline">{post.performance_score || 0}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Content Library Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-3xl font-semibold text-foreground">{stats?.totalPosts ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Total Articles</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-3xl font-semibold text-foreground">{stats?.drafts ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Drafts Pending Review</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <Badge variant={isEngineActive ? 'default' : 'secondary'} className="text-lg px-4 py-1">
                    {isEngineActive ? 'Engine Running' : 'Engine Paused'}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-2">{settings?.posts_per_day ?? 1} posts/day</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Queue */}
          <TabsContent value="queue">
            <BlogQueueTable />
          </TabsContent>

          {/* Articles */}
          <TabsContent value="articles">
            <BlogArticleManager />
          </TabsContent>

          {/* A/B Tests */}
          <TabsContent value="ab-tests">
            <ABTestPanel />
          </TabsContent>

          {/* Learnings */}
          <TabsContent value="learnings">
            <BlogLearningsPanel />
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Engine Configuration</CardTitle>
                <CardDescription>
                  Use the Engine Control button above for full configuration. This tab shows a summary.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={isEngineActive ? 'default' : 'secondary'}>
                      {isEngineActive ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Posts/Day</p>
                    <p className="font-medium">{settings?.posts_per_day ?? 1}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Auto-Publish</p>
                    <Badge variant={settings?.auto_publish ? 'default' : 'outline'}>
                      {settings?.auto_publish ? 'On' : 'Off'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expert Review</p>
                    <Badge variant={settings?.require_medical_review ? 'default' : 'outline'}>
                      {settings?.require_medical_review ? 'Required' : 'Disabled'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Min Quality</p>
                    <p className="font-medium">{settings?.min_quality_score ?? 70}/100</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Publishing Window</p>
                    <p className="font-medium">
                      {settings?.publishing_window_start || '09:00'} – {settings?.publishing_window_end || '17:00'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default BlogEngine;
