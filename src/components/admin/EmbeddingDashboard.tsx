import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useEmbeddingGenerator, type SemanticEntityType } from '@/hooks/useSemanticSearch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database, Zap, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface EmbeddingStats {
  entity_type: string;
  total_records: number;
  with_embeddings: number;
  percentage: number;
}

export function EmbeddingDashboard() {
  const [stats, setStats] = useState<EmbeddingStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const { batchGenerateEmbeddings } = useEmbeddingGenerator();
  const { toast } = useToast();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_embedding_stats');
      if (error) throw error;
      setStats(data || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch embedding statistics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleBatchGenerate = async (entityType: SemanticEntityType) => {
    setProcessing(prev => ({ ...prev, [entityType]: true }));
    
    try {
      const result = await batchGenerateEmbeddings(entityType, 100, 0);
      
      if (result) {
        toast({
          title: 'Batch Processing Complete',
          description: `Processed ${result.processed} records with ${result.errors} errors`,
          variant: result.errors > 0 ? 'destructive' : 'default',
        });
        
        // Refresh stats
        await fetchStats();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Batch processing failed',
        variant: 'destructive',
      });
    } finally {
      setProcessing(prev => ({ ...prev, [entityType]: false }));
    }
  };

  const getEntityTypeKey = (displayName: string): SemanticEntityType | null => {
    const mapping: Record<string, SemanticEntityType> = {
      'candidates': 'candidate',
      'jobs': 'job',
      'knowledge_articles': 'knowledge',
      'interactions': 'interaction',
    };
    return mapping[displayName] || null;
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-500';
    if (percentage >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (percentage >= 60) return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    return <AlertCircle className="h-5 w-5 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Semantic Search</h2>
          <p className="text-muted-foreground">
            Embedding coverage and batch generation
          </p>
        </div>
        <Button
          onClick={fetchStats}
          disabled={loading}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const entityKey = getEntityTypeKey(stat.entity_type);
          const isProcessing = entityKey ? processing[entityKey] : false;

          return (
            <Card key={stat.entity_type}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium capitalize">
                  {stat.entity_type.replace('_', ' ')}
                </CardTitle>
                {getStatusIcon(stat.percentage)}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">
                      {stat.with_embeddings}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {stat.total_records}
                    </span>
                  </div>
                  
                  <Progress value={stat.percentage} className="h-2" />
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className={getStatusColor(stat.percentage)}>
                      {stat.percentage.toFixed(1)}% complete
                    </span>
                    {stat.total_records - stat.with_embeddings > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {stat.total_records - stat.with_embeddings} pending
                      </Badge>
                    )}
                  </div>

                  {entityKey && stat.percentage < 100 && (
                    <Button
                      onClick={() => handleBatchGenerate(entityKey)}
                      disabled={isProcessing}
                      size="sm"
                      className="w-full mt-2"
                      variant="outline"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Zap className="h-3 w-3 mr-2" />
                          Generate (100)
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            About Semantic Search
          </CardTitle>
          <CardDescription>
            Phase 1 of AI-first transformation complete
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">What's Enabled</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Vector embeddings (1536 dimensions)</li>
                <li>• Semantic similarity search</li>
                <li>• Cosine distance ranking</li>
                <li>• HNSW indexes for speed</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Use Cases</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Find similar candidates</li>
                <li>• Match jobs to candidates</li>
                <li>• Knowledge base search</li>
                <li>• Enhanced ML matching</li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Embeddings are generated using OpenAI text-embedding-3-small via Lovable AI.
              Processing is rate-limited to 100 entities per batch to avoid API throttling.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}