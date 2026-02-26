import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Bot,
  Zap,
  FileText,
  BarChart3,
  Settings,
  RefreshCcw,
  Loader2,
} from 'lucide-react';
import { useBlogEngineSettings } from '@/hooks/useBlogEngineSettings';
import { useBlogGeneration } from '@/hooks/useBlogGeneration';
import { toast } from 'sonner';

const BlogEngine: React.FC = () => {
  const {
    settings,
    isLoading: settingsLoading,
    isEngineActive,
    updateSettings,
    isSaving,
  } = useBlogEngineSettings();

  const { addToQueue, fetchQueue, isGenerating } = useBlogGeneration();
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [topicInput, setTopicInput] = useState('');

  React.useEffect(() => {
    fetchQueue().then((items) => {
      setQueueItems(items);
      setQueueLoading(false);
    });
  }, []);

  const handleToggleEngine = async () => {
    try {
      await updateSettings({ is_active: !isEngineActive });
    } catch {
      toast.error('Failed to toggle engine');
    }
  };

  const handleQueueTopic = async () => {
    if (!topicInput.trim()) return;
    try {
      await generateArticle({
        topic: topicInput.trim(),
        category: 'career-insights',
        format: 'deep-dive',
      });
      setTopicInput('');
      toast.success('Topic queued for generation');
    } catch {
      toast.error('Failed to queue topic');
    }
  };

  return (
    <>
      <Helmet>
        <title>Blog Engine | Admin</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Blog Engine</h1>
            <p className="text-muted-foreground mt-1">AI-powered content generation and management.</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={isEngineActive} onCheckedChange={handleToggleEngine} disabled={settingsLoading} />
              <Badge variant={isEngineActive ? 'default' : 'secondary'}>
                {isEngineActive ? 'Active' : 'Paused'}
              </Badge>
            </div>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="queue" className="gap-2">
              <Zap className="h-4 w-4" />
              Queue
            </TabsTrigger>
            <TabsTrigger value="articles" className="gap-2">
              <FileText className="h-4 w-4" />
              Articles
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Published Articles</CardDescription>
                  <CardTitle className="text-3xl">—</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>In Queue</CardDescription>
                  <CardTitle className="text-3xl">{queueItems?.length ?? 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Engine Status</CardDescription>
                  <CardTitle className="text-3xl">
                    <Badge variant={isEngineActive ? 'default' : 'secondary'}>
                      {isEngineActive ? 'Running' : 'Paused'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          {/* Queue Tab */}
          <TabsContent value="queue" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate New Article</CardTitle>
                <CardDescription>Enter a topic to queue for AI generation.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Input
                    placeholder="e.g., How to negotiate a senior role offer"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleQueueTopic()}
                    className="flex-1"
                  />
                  <Button onClick={handleQueueTopic} disabled={isGenerating || !topicInput.trim()}>
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bot className="h-4 w-4 mr-2" />}
                    Generate
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generation Queue</CardTitle>
              </CardHeader>
              <CardContent>
                {queueLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !queueItems?.length ? (
                  <p className="text-muted-foreground text-center py-8">Queue is empty. Add a topic above.</p>
                ) : (
                  <div className="space-y-3">
                    {queueItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div>
                          <p className="font-medium text-foreground">{item.topic}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.format} · {item.category}
                          </p>
                        </div>
                        <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Articles Tab */}
          <TabsContent value="articles">
            <Card>
              <CardHeader>
                <CardTitle>Published Articles</CardTitle>
                <CardDescription>Manage your published blog content.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Article management coming soon. View published articles at{' '}
                  <a href="/blog" className="text-accent hover:underline">/blog</a>.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Engine Configuration</CardTitle>
                <CardDescription>Control how the blog engine generates and publishes content.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Posts per day</Label>
                  <Slider
                    value={[settings?.posts_per_day ?? 1]}
                    onValueChange={([v]) => updateSettings({ posts_per_day: v })}
                    min={0}
                    max={5}
                    step={1}
                    disabled={isSaving}
                  />
                  <p className="text-sm text-muted-foreground">{settings?.posts_per_day ?? 1} posts/day</p>
                </div>

                <div className="space-y-2">
                  <Label>Minimum quality score</Label>
                  <Slider
                    value={[settings?.min_quality_score ?? 70]}
                    onValueChange={([v]) => updateSettings({ min_quality_score: v })}
                    min={0}
                    max={100}
                    step={5}
                    disabled={isSaving}
                  />
                  <p className="text-sm text-muted-foreground">{settings?.min_quality_score ?? 70}/100</p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-publish</Label>
                    <p className="text-sm text-muted-foreground">Automatically publish articles that pass quality checks.</p>
                  </div>
                  <Switch
                    checked={settings?.auto_publish ?? false}
                    onCheckedChange={(v) => updateSettings({ auto_publish: v })}
                    disabled={isSaving}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require expert review</Label>
                    <p className="text-sm text-muted-foreground">Hold articles for manual review before publishing.</p>
                  </div>
                  <Switch
                    checked={settings?.require_medical_review ?? true}
                    onCheckedChange={(v) => updateSettings({ require_medical_review: v })}
                    disabled={isSaving}
                  />
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
