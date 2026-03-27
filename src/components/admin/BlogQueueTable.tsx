import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bot,
  Loader2,
  Trash2,
  Zap,
  RefreshCcw,
  Sparkles,
  Plus,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useBlogGeneration, type ContentFormat } from '@/hooks/useBlogGeneration';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const CATEGORIES = [
  { value: 'career-insights', label: 'Career Insights' },
  { value: 'talent-strategy', label: 'Talent Strategy' },
  { value: 'industry-trends', label: 'Industry Trends' },
  { value: 'leadership', label: 'Leadership' },
];

const FORMATS: { value: ContentFormat; label: string }[] = [
  { value: 'career-playbook', label: 'Career Playbook' },
  { value: 'market-analysis', label: 'Market Analysis' },
  { value: 'trend-report', label: 'Trend Report' },
  { value: 'success-story', label: 'Success Story' },
  { value: 'myth-buster', label: 'Myth-Buster' },
  { value: 'talent-origin', label: 'Talent Origin' },
  { value: 'executive-stack', label: 'Executive Stack' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  generating: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
};

const BlogQueueTable: React.FC = () => {
  const { t } = useTranslation('admin');
  const {
    isGenerating,
    isSuggesting,
    suggestions,
    addToQueue,
    generateFromQueue,
    getSuggestions,
    fetchQueue,
    updatePriority,
    deleteFromQueue,
  } = useBlogGeneration();

  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [topicInput, setTopicInput] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('career-insights');
  const [selectedFormat, setSelectedFormat] = useState<ContentFormat>('career-playbook');

  const refreshQueue = async () => {
    setQueueLoading(true);
    const items = await fetchQueue();
    setQueueItems(items);
    setQueueLoading(false);
  };

  useEffect(() => {
    refreshQueue();
  }, []);

  const handleAddToQueue = async () => {
    if (!topicInput.trim()) return;
    const keywords = keywordsInput.split(',').map((k) => k.trim()).filter(Boolean);
    await addToQueue(topicInput.trim(), selectedCategory, keywords.length ? keywords : undefined, 5, selectedFormat);
    setTopicInput('');
    setKeywordsInput('');
    await refreshQueue();
  };

  const handleGenerate = async (item: any) => {
    await generateFromQueue(item);
    await refreshQueue();
  };

  const handleDelete = async (id: string) => {
    await deleteFromQueue(id);
    await refreshQueue();
  };

  const handlePriority = async (id: string, delta: number) => {
    const item = queueItems.find((i) => i.id === id);
    if (!item) return;
    const newPriority = Math.max(1, Math.min(10, (item.priority || 5) + delta));
    await updatePriority(id, newPriority);
    await refreshQueue();
  };

  const handleAddSuggestion = async (suggestion: any) => {
    await addToQueue(suggestion.topic, suggestion.category, suggestion.targetKeywords, suggestion.priority, suggestion.format);
    await refreshQueue();
  };

  return (
    <div className="space-y-6">
      {/* Add to Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Queue New Article</CardTitle>
          <CardDescription>Add a topic with category, keywords, and format for AI generation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Topic</Label>
              <Input
                placeholder="e.g., How to negotiate a senior role offer"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddToQueue()}
              />
            </div>
            <div className="space-y-2">
              <Label>Keywords (comma-separated)</Label>
              <Input
                placeholder="e.g., salary, negotiation, senior role"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as ContentFormat)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddToQueue} disabled={!topicInput.trim()}>
              <Plus className="h-4 w-4 mr-2" /> Add to Queue
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">AI Topic Suggestions</CardTitle>
            <CardDescription>Powered by QUIN — gap analysis against existing content.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => getSuggestions()} disabled={isSuggesting}>
            {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Get Suggestions
          </Button>
        </CardHeader>
        {suggestions.length > 0 && (
          <CardContent>
            <div className="space-y-3">
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-start justify-between p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex-1 space-y-1">
                    <p className="font-medium text-foreground">{s.topic}</p>
                    <p className="text-sm text-muted-foreground">{s.reasoning}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{CATEGORIES.find((c) => c.value === s.category)?.label || s.category}</Badge>
                      <Badge variant="outline">{FORMATS.find((f) => f.value === s.format)?.label || s.format}</Badge>
                      <Badge variant="outline">Priority: {s.priority}/10</Badge>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleAddSuggestion(s)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Queue Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Generation Queue</CardTitle>
            <CardDescription>{queueItems.length} items in queue</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={refreshQueue}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {queueLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !queueItems.length ? (
            <p className="text-muted-foreground text-center py-8">Queue is empty. Add a topic above or generate AI suggestions.</p>
          ) : (
            <div className="space-y-2">
              {queueItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <div className="flex flex-col items-center gap-0.5">
                    <button onClick={() => handlePriority(item.id, 1)} className="text-muted-foreground hover:text-foreground">
                      <ChevronUp className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-mono text-muted-foreground">{item.priority || 5}</span>
                    <button onClick={() => handlePriority(item.id, -1)} className="text-muted-foreground hover:text-foreground">
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{item.topic}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{item.category}</Badge>
                      {item.content_format && <Badge variant="outline" className="text-xs">{item.content_format}</Badge>}
                      <Badge variant="outline" className="text-xs">
                        {item.source === 'ai_suggestion' ? 'AI' : 'Manual'}
                      </Badge>
                    </div>
                  </div>
                  <Badge className={`${STATUS_COLORS[item.status] || ''} border`}>
                    {item.status}
                  </Badge>
                  <div className="flex gap-1">
                    {item.status === 'pending' && (
                      <Button size="sm" variant="ghost" onClick={() => handleGenerate(item)} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      </Button>
                    )}
                    {item.status === 'failed' && (
                      <Button size="sm" variant="ghost" onClick={() => handleGenerate(item)} disabled={isGenerating}>
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BlogQueueTable;
