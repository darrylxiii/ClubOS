import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Database,
  GitBranch,
  Search,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  FileCode,
  Server,
  Zap,
} from 'lucide-react';
import { UnifiedKPI } from '@/hooks/useUnifiedKPIs';
import { useKPILineageMetadata, generateDefaultLineage, type KPILineageMetadata } from '@/hooks/useKPILineage';

interface DataSource {
  id: string;
  name: string;
  type: 'database' | 'api' | 'calculation' | 'manual';
  table?: string;
  refreshRate: string;
  lastUpdated: string;
  status: 'active' | 'stale' | 'error';
}

interface DataLineage {
  kpiId: string;
  sources: DataSource[];
  transformations: string[];
  dependencies: string[];
  consumers: string[];
}

interface DataLineageViewerProps {
  kpis: UnifiedKPI[];
  selectedKPI?: UnifiedKPI | null;
  onSelectKPI?: (kpi: UnifiedKPI) => void;
}

// Convert database lineage or generate default lineage for a KPI
const getLineageData = (
  kpi: UnifiedKPI, 
  dbLineage: KPILineageMetadata | null | undefined,
  lastCalculatedAt?: string | null
): DataLineage => {
  // If we have database lineage, use it
  if (dbLineage) {
    const sources: DataSource[] = [
      ...(dbLineage.source_tables || []).map((table, idx) => ({
        id: `db-${idx}`,
        name: table.split('.').pop() || table,
        type: 'database' as const,
        table: table.includes('.') ? table : `public.${table}`,
        refreshRate: dbLineage.refresh_rate || 'Unknown',
        lastUpdated: dbLineage.last_calculated_at 
          ? new Date(dbLineage.last_calculated_at).toLocaleString() 
          : 'Unknown',
        status: 'active' as const
      })),
      ...(dbLineage.source_apis || []).map((api, idx) => ({
        id: `api-${idx}`,
        name: api,
        type: 'api' as const,
        refreshRate: dbLineage.refresh_rate || 'Unknown',
        lastUpdated: dbLineage.last_calculated_at 
          ? new Date(dbLineage.last_calculated_at).toLocaleString() 
          : 'Unknown',
        status: 'active' as const
      }))
    ];

    return {
      kpiId: kpi.id,
      sources: sources.length > 0 ? sources : [
        { id: 's0', name: 'Manual Entry', type: 'manual', refreshRate: 'On demand', lastUpdated: 'Unknown', status: 'stale' }
      ],
      transformations: (dbLineage.transformations || []).map(t => 
        typeof t === 'string' ? t : t.name
      ),
      dependencies: dbLineage.dependencies || ['User Permissions'],
      consumers: dbLineage.consumers || ['Executive Dashboard']
    };
  }

  // Generate default lineage based on domain
  const defaults = generateDefaultLineage(kpi.name, kpi.domain);
  const sources: DataSource[] = [
    ...(defaults.source_tables || []).map((table, idx) => ({
      id: `db-${idx}`,
      name: table,
      type: 'database' as const,
      table: `public.${table}`,
      refreshRate: defaults.refresh_rate || 'Real-time',
      lastUpdated: 'Live',
      status: 'active' as const
    })),
    ...(defaults.source_apis || []).map((api, idx) => ({
      id: `api-${idx}`,
      name: api,
      type: 'api' as const,
      refreshRate: defaults.refresh_rate || 'Hourly',
      lastUpdated: 'Recently',
      status: 'active' as const
    }))
  ];

  return {
    kpiId: kpi.id,
    sources: sources.length > 0 ? sources : [
      { id: 's0', name: 'Calculated', type: 'calculation', refreshRate: 'On demand', lastUpdated: 'Unknown', status: 'active' }
    ],
    transformations: (defaults.transformations || []).map(t => 
      typeof t === 'string' ? t : t.name
    ),
    dependencies: defaults.dependencies || ['User Permissions'],
    consumers: defaults.consumers || ['Executive Dashboard', 'Weekly Report']
  };
};

export function DataLineageViewer({ kpis, selectedKPI, onSelectKPI }: DataLineageViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('lineage');
  const [internalSelectedKPI, setInternalSelectedKPI] = useState<UnifiedKPI | null>(null);

  const currentKPI = selectedKPI || internalSelectedKPI;
  
  // Fetch all lineage metadata from database
  const { data: allLineageData = [], isLoading: isLoadingLineage } = useKPILineageMetadata();
  
  // Get lineage for current KPI (from DB or generated default)
  const lineageData = useMemo(() => {
    if (!currentKPI) return null;
    const dbLineage = allLineageData.find(l => l.kpi_name === currentKPI.name);
    return getLineageData(currentKPI, dbLineage);
  }, [currentKPI, allLineageData]);

  const filteredKPIs = useMemo(() => 
    kpis.filter(kpi => 
      kpi.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kpi.domain.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [kpis, searchQuery]
  );

  const handleSelectKPI = (kpi: UnifiedKPI) => {
    if (onSelectKPI) {
      onSelectKPI(kpi);
    } else {
      setInternalSelectedKPI(kpi);
    }
  };

  const getSourceIcon = (type: DataSource['type']) => {
    switch (type) {
      case 'database': return <Database className="h-4 w-4" />;
      case 'api': return <Server className="h-4 w-4" />;
      case 'calculation': return <Zap className="h-4 w-4" />;
      case 'manual': return <FileCode className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: DataSource['status']) => {
    switch (status) {
      case 'active': return 'text-emerald-400';
      case 'stale': return 'text-amber-400';
      case 'error': return 'text-red-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Data Lineage
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Trace data sources, transformations, and dependencies for each KPI
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh All
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* KPI Selector */}
        <div className="col-span-4">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Select KPI</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search KPIs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="px-4 pb-4 space-y-1">
                  {filteredKPIs.map((kpi) => (
                    <button
                      key={kpi.id}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        currentKPI?.id === kpi.id
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted/50 border border-transparent'
                      }`}
                      onClick={() => handleSelectKPI(kpi)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{kpi.displayName}</p>
                          <p className="text-xs text-muted-foreground">{kpi.domain}</p>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={
                            kpi.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                            kpi.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                            'bg-red-500/10 text-red-400 border-red-500/30'
                          }
                        >
                          {kpi.status}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Lineage Visualization */}
        <div className="col-span-8">
          {lineageData && currentKPI ? (
            <Card className="bg-card/50 backdrop-blur border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">
                    {currentKPI.displayName}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {currentKPI.domain}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="lineage" className="text-xs">
                      <GitBranch className="h-3.5 w-3.5 mr-1.5" />
                      Lineage
                    </TabsTrigger>
                    <TabsTrigger value="sources" className="text-xs">
                      <Database className="h-3.5 w-3.5 mr-1.5" />
                      Sources
                    </TabsTrigger>
                    <TabsTrigger value="consumers" className="text-xs">
                      <Layers className="h-3.5 w-3.5 mr-1.5" />
                      Consumers
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="lineage" className="mt-0">
                    {/* Visual Flow Diagram */}
                    <div className="relative">
                      {/* Sources */}
                      <div className="flex flex-col gap-2 mb-4">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Data Sources
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {lineageData.sources.map((source) => (
                            <TooltipProvider key={source.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
                                    <span className={getStatusColor(source.status)}>
                                      {getSourceIcon(source.type)}
                                    </span>
                                    <span className="text-sm font-medium">{source.name}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs">
                                    <p>Table: {source.table || 'N/A'}</p>
                                    <p>Refresh: {source.refreshRate}</p>
                                    <p>Updated: {source.lastUpdated}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex justify-center my-3">
                        <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
                      </div>

                      {/* Transformations */}
                      <div className="flex flex-col gap-2 mb-4">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Transformations
                        </span>
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <div className="flex flex-wrap gap-2">
                            {lineageData.transformations.map((transform, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs bg-background">
                                {transform}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex justify-center my-3">
                        <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
                      </div>

                      {/* KPI Output */}
                      <div className="flex flex-col gap-2 mb-4">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          KPI Output
                        </span>
                        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
                          <p className="text-lg font-bold text-foreground">{currentKPI.displayName}</p>
                          <p className="text-2xl font-bold text-emerald-400 mt-1">
                            {typeof currentKPI.value === 'number' ? currentKPI.value.toLocaleString() : currentKPI.value}
                          </p>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex justify-center my-3">
                        <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
                      </div>

                      {/* Consumers */}
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Consumers
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {lineageData.consumers.map((consumer, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {consumer}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="sources" className="mt-0">
                    <div className="space-y-3">
                      {lineageData.sources.map((source) => (
                        <div 
                          key={source.id}
                          className="p-4 rounded-lg bg-muted/30 border border-border/50"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg bg-background ${getStatusColor(source.status)}`}>
                                {getSourceIcon(source.type)}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{source.name}</p>
                                <p className="text-xs text-muted-foreground">{source.table || source.type}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {source.status === 'active' ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              ) : source.status === 'stale' ? (
                                <Clock className="h-4 w-4 text-amber-400" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-red-400" />
                              )}
                              <span className="text-xs text-muted-foreground">{source.lastUpdated}</span>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Refresh: {source.refreshRate}</span>
                            <span>Type: {source.type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="consumers" className="mt-0">
                    <div className="space-y-3">
                      {lineageData.consumers.map((consumer, idx) => (
                        <div 
                          key={idx}
                          className="p-4 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-background text-primary">
                              <Layers className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-foreground">{consumer}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">Active</Badge>
                        </div>
                      ))}

                      <div className="mt-4 p-4 rounded-lg border border-dashed border-border/50 text-center">
                        <p className="text-sm text-muted-foreground">
                          Dependencies: {lineageData.dependencies.join(', ')}
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card/50 backdrop-blur border-border/50 h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Select a KPI to view its data lineage</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
