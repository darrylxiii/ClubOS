import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Target, Link2, TrendingUp, Plus, X, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { UnifiedKPI } from '@/hooks/useUnifiedKPIs';
import { useOKRObjectives, useKPIOKRLinks, type OKRObjective, type OKRKeyResult } from '@/hooks/useOKRs';
import { toast } from 'sonner';

interface OKRIntegrationProps {
  kpis: UnifiedKPI[];
  onLinkKPI?: (kpiId: string, keyResultId: string, weight: number) => void;
  onUnlinkKPI?: (kpiId: string, keyResultId: string) => void;
}

export function OKRIntegration({ kpis, onLinkKPI, onUnlinkKPI }: OKRIntegrationProps) {
  const currentYear = new Date().getFullYear();
  const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
  
  const [selectedQuarter, setSelectedQuarter] = useState(`${currentQuarter} ${currentYear}`);
  const [selectedOKR, setSelectedOKR] = useState<OKRObjective | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedKR, setSelectedKR] = useState<OKRKeyResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contributionWeight, setContributionWeight] = useState([25]);

  // Parse quarter/year from selection
  const [quarter, year] = useMemo(() => {
    const parts = selectedQuarter.split(' ');
    return [parts[0], parseInt(parts[1])];
  }, [selectedQuarter]);

  // Fetch OKRs from database
  const { data: okrs = [], isLoading: okrsLoading } = useOKRObjectives(quarter, year);
  
  // Fetch KPI-OKR links
  const { links, linkKPI, unlinkKPI, isLinking, getLinksForKeyResult } = useKPIOKRLinks();

  const getStatusColor = (status: OKRObjective['status']) => {
    switch (status) {
      case 'on-track': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'at-risk': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'off-track': return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'completed': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredKPIs = kpis.filter(kpi => 
    kpi.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kpi.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLinkedKPIDetails = (kpiName: string) => {
    return kpis.find(k => 
      k.id === kpiName || 
      k.name === kpiName ||
      k.displayName.toLowerCase().replace(/\s+/g, '_') === kpiName.toLowerCase()
    );
  };

  const handleLinkKPI = (kpi: UnifiedKPI) => {
    if (selectedKR) {
      if (onLinkKPI) {
        onLinkKPI(kpi.id, selectedKR.id, contributionWeight[0]);
      } else {
        linkKPI({ 
          kpiName: kpi.name, 
          keyResultId: selectedKR.id, 
          weight: contributionWeight[0] 
        }, {
          onSuccess: () => toast.success(`Linked ${kpi.displayName} to Key Result`)
        });
      }
    }
    setLinkDialogOpen(false);
    setSelectedKR(null);
  };

  const handleUnlinkKPI = (kpiName: string, keyResultId: string) => {
    if (onUnlinkKPI) {
      onUnlinkKPI(kpiName, keyResultId);
    } else {
      unlinkKPI({ kpiName, keyResultId }, {
        onSuccess: () => toast.success('KPI unlinked')
      });
    }
  };

  // Get linked KPIs for a key result
  const getLinkedKPIsForKR = (keyResultId: string) => {
    return getLinksForKeyResult(keyResultId).map(link => link.kpi_name);
  };

  // Calculate total linked KPIs
  const totalLinkedKPIs = useMemo(() => {
    return okrs.reduce((acc, okr) => {
      return acc + (okr.key_results || []).reduce((krAcc, kr) => {
        return krAcc + getLinkedKPIsForKR(kr.id).length;
      }, 0);
    }, 0);
  }, [okrs, links]);

  if (okrsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            OKR Integration
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Link KPIs to Objectives & Key Results for strategic alignment
          </p>
        </div>
        <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Quarter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={`Q1 ${currentYear}`}>Q1 {currentYear}</SelectItem>
            <SelectItem value={`Q2 ${currentYear}`}>Q2 {currentYear}</SelectItem>
            <SelectItem value={`Q3 ${currentYear}`}>Q3 {currentYear}</SelectItem>
            <SelectItem value={`Q4 ${currentYear}`}>Q4 {currentYear}</SelectItem>
            <SelectItem value={`Q4 ${currentYear - 1}`}>Q4 {currentYear - 1}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty State */}
      {okrs.length === 0 && (
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No OKRs Found</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              No objectives have been created for {selectedQuarter}. OKRs can be created by administrators to track strategic goals.
            </p>
          </CardContent>
        </Card>
      )}

      {/* OKR Cards */}
      <div className="grid gap-4">
        {okrs.map((okr) => (
          <Card 
            key={okr.id} 
            className={`bg-card/50 backdrop-blur border-border/50 cursor-pointer transition-all hover:border-primary/30 ${
              selectedOKR?.id === okr.id ? 'border-primary/50 ring-1 ring-primary/20' : ''
            }`}
            onClick={() => setSelectedOKR(selectedOKR?.id === okr.id ? null : okr)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base font-medium text-foreground">
                    {okr.title}
                  </CardTitle>
                  {okr.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {okr.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <Badge variant="outline" className={getStatusColor(okr.status)}>
                      {okr.status.replace('-', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{okr.quarter} {okr.year}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-foreground">{okr.progress}%</span>
                  <p className="text-xs text-muted-foreground">Overall Progress</p>
                </div>
              </div>
              <Progress value={okr.progress} className="h-1.5 mt-3" />
            </CardHeader>

            {selectedOKR?.id === okr.id && okr.key_results && okr.key_results.length > 0 && (
              <CardContent className="pt-0">
                <div className="border-t border-border/50 pt-4 mt-2">
                  <h4 className="text-sm font-medium text-foreground mb-3">Key Results</h4>
                  <div className="space-y-3">
                    {okr.key_results.map((kr) => {
                      const linkedKPIs = getLinkedKPIsForKR(kr.id);
                      const progress = kr.target_value > 0 
                        ? Math.min((kr.current_value / kr.target_value) * 100, 100) 
                        : 0;

                      return (
                        <div 
                          key={kr.id} 
                          className="p-3 rounded-lg bg-muted/30 border border-border/30"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">{kr.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {kr.current_value} / {kr.target_value} {kr.unit}
                                </span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">
                                  Weight: {kr.contribution_weight}%
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-semibold text-foreground">
                                {Math.round(progress)}%
                              </span>
                            </div>
                          </div>
                          
                          <Progress 
                            value={progress} 
                            className="h-1 mb-3" 
                          />

                          {/* Linked KPIs */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">Linked KPIs:</span>
                            {linkedKPIs.length > 0 ? (
                              linkedKPIs.map((kpiName) => {
                                const kpi = getLinkedKPIDetails(kpiName);
                                return (
                                  <Badge 
                                    key={kpiName} 
                                    variant="secondary" 
                                    className="text-xs gap-1 bg-primary/10 text-primary border-primary/30"
                                  >
                                    <Link2 className="h-3 w-3" />
                                    {kpi?.displayName || kpiName}
                                    <button 
                                      className="ml-1 hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnlinkKPI(kpiName, kr.id);
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                );
                              })
                            ) : (
                              <span className="text-xs text-muted-foreground italic">None linked</span>
                            )}
                            <Dialog open={linkDialogOpen && selectedKR?.id === kr.id} onOpenChange={(open) => {
                              setLinkDialogOpen(open);
                              if (!open) setSelectedKR(null);
                            }}>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-6 px-2 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedKR(kr);
                                    setLinkDialogOpen(true);
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Link KPI
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
                                <DialogHeader>
                                  <DialogTitle>Link KPI to Key Result</DialogTitle>
                                  <DialogDescription>
                                    Select a KPI to link to "{kr.title}"
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      placeholder="Search KPIs..."
                                      value={searchQuery}
                                      onChange={(e) => setSearchQuery(e.target.value)}
                                      className="pl-9"
                                    />
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Contribution Weight: {contributionWeight[0]}%</label>
                                    <Slider
                                      value={contributionWeight}
                                      onValueChange={setContributionWeight}
                                      max={100}
                                      min={5}
                                      step={5}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                      How much this KPI contributes to the Key Result progress
                                    </p>
                                  </div>

                                  <ScrollArea className="h-[250px] pr-4">
                                    <div className="space-y-2">
                                      {filteredKPIs.map((kpi) => (
                                        <button
                                          key={kpi.id}
                                          className="w-full p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                                          onClick={() => handleLinkKPI(kpi)}
                                          disabled={isLinking}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <p className="text-sm font-medium text-foreground">{kpi.displayName}</p>
                                              <p className="text-xs text-muted-foreground">{kpi.domain}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Badge 
                                                variant="outline" 
                                                className={
                                                  kpi.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                                                  kpi.status === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                                                  'bg-red-500/10 text-red-400'
                                                }
                                              >
                                                {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                                              </Badge>
                                              <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      {okrs.length > 0 && (
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardContent className="py-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">{okrs.length}</p>
                <p className="text-xs text-muted-foreground">Active OKRs</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {okrs.reduce((acc, o) => acc + (o.key_results?.length || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Key Results</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">
                  {okrs.filter(o => o.status === 'on-track' || o.status === 'completed').length}
                </p>
                <p className="text-xs text-muted-foreground">On Track</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {totalLinkedKPIs}
                </p>
                <p className="text-xs text-muted-foreground">Linked KPIs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
