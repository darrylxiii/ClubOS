import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Target, Link2, TrendingUp, Plus, X, Search, CheckCircle2 } from 'lucide-react';
import { UnifiedKPI } from '@/hooks/useUnifiedKPIs';

interface OKR {
  id: string;
  objective: string;
  keyResults: KeyResult[];
  quarter: string;
  owner: string;
  status: 'on-track' | 'at-risk' | 'off-track';
  progress: number;
}

interface KeyResult {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  linkedKPIs: string[];
  contributionWeight: number;
}

interface OKRIntegrationProps {
  kpis: UnifiedKPI[];
  onLinkKPI?: (kpiId: string, keyResultId: string, weight: number) => void;
  onUnlinkKPI?: (kpiId: string, keyResultId: string) => void;
}

// Mock OKR data - would come from database in production
const mockOKRs: OKR[] = [
  {
    id: 'okr-1',
    objective: 'Accelerate hiring velocity for Q1 placements',
    quarter: 'Q1 2025',
    owner: 'Head of Talent',
    status: 'on-track',
    progress: 68,
    keyResults: [
      {
        id: 'kr-1',
        title: 'Reduce time-to-shortlist to under 48 hours',
        target: 48,
        current: 52,
        unit: 'hours',
        linkedKPIs: ['time_to_shortlist'],
        contributionWeight: 40,
      },
      {
        id: 'kr-2',
        title: 'Achieve 90% candidate response rate',
        target: 90,
        current: 78,
        unit: '%',
        linkedKPIs: ['candidate_response_rate'],
        contributionWeight: 30,
      },
      {
        id: 'kr-3',
        title: 'Complete 50 placements',
        target: 50,
        current: 34,
        unit: 'placements',
        linkedKPIs: ['placements_completed'],
        contributionWeight: 30,
      },
    ],
  },
  {
    id: 'okr-2',
    objective: 'Maximize candidate satisfaction and NPS',
    quarter: 'Q1 2025',
    owner: 'Head of Experience',
    status: 'at-risk',
    progress: 45,
    keyResults: [
      {
        id: 'kr-4',
        title: 'Achieve candidate NPS of 70+',
        target: 70,
        current: 58,
        unit: 'NPS',
        linkedKPIs: ['candidate_nps'],
        contributionWeight: 50,
      },
      {
        id: 'kr-5',
        title: 'Reduce candidate drop-off rate to under 15%',
        target: 15,
        current: 22,
        unit: '%',
        linkedKPIs: ['candidate_dropoff'],
        contributionWeight: 50,
      },
    ],
  },
  {
    id: 'okr-3',
    objective: 'Expand client portfolio and revenue',
    quarter: 'Q1 2025',
    owner: 'Head of Sales',
    status: 'on-track',
    progress: 72,
    keyResults: [
      {
        id: 'kr-6',
        title: 'Onboard 15 new client companies',
        target: 15,
        current: 11,
        unit: 'clients',
        linkedKPIs: ['new_clients'],
        contributionWeight: 40,
      },
      {
        id: 'kr-7',
        title: 'Achieve €500K in new revenue',
        target: 500000,
        current: 380000,
        unit: '€',
        linkedKPIs: ['revenue'],
        contributionWeight: 60,
      },
    ],
  },
];

export function OKRIntegration({ kpis, onLinkKPI, onUnlinkKPI }: OKRIntegrationProps) {
  const [okrs] = useState<OKR[]>(mockOKRs);
  const [selectedOKR, setSelectedOKR] = useState<OKR | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [selectedKR, setSelectedKR] = useState<KeyResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contributionWeight, setContributionWeight] = useState([25]);

  const getStatusColor = (status: OKR['status']) => {
    switch (status) {
      case 'on-track': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'at-risk': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'off-track': return 'bg-red-500/10 text-red-400 border-red-500/30';
    }
  };

  const filteredKPIs = kpis.filter(kpi => 
    kpi.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kpi.domain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLinkedKPIDetails = (kpiId: string) => {
    return kpis.find(k => k.id === kpiId || k.displayName.toLowerCase().replace(/\s+/g, '_') === kpiId);
  };

  const handleLinkKPI = (kpi: UnifiedKPI) => {
    if (selectedKR && onLinkKPI) {
      onLinkKPI(kpi.id, selectedKR.id, contributionWeight[0]);
    }
    setLinkDialogOpen(false);
    setSelectedKR(null);
  };

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
        <Select defaultValue="Q1 2025">
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Quarter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Q1 2025">Q1 2025</SelectItem>
            <SelectItem value="Q4 2024">Q4 2024</SelectItem>
            <SelectItem value="Q3 2024">Q3 2024</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
                    {okr.objective}
                  </CardTitle>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge variant="outline" className={getStatusColor(okr.status)}>
                      {okr.status.replace('-', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{okr.quarter}</span>
                    <span className="text-xs text-muted-foreground">Owner: {okr.owner}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-foreground">{okr.progress}%</span>
                  <p className="text-xs text-muted-foreground">Overall Progress</p>
                </div>
              </div>
              <Progress value={okr.progress} className="h-1.5 mt-3" />
            </CardHeader>

            {selectedOKR?.id === okr.id && (
              <CardContent className="pt-0">
                <div className="border-t border-border/50 pt-4 mt-2">
                  <h4 className="text-sm font-medium text-foreground mb-3">Key Results</h4>
                  <div className="space-y-3">
                    {okr.keyResults.map((kr) => (
                      <div 
                        key={kr.id} 
                        className="p-3 rounded-lg bg-muted/30 border border-border/30"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{kr.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {kr.current} / {kr.target} {kr.unit}
                              </span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground">
                                Weight: {kr.contributionWeight}%
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-semibold text-foreground">
                              {Math.round((kr.current / kr.target) * 100)}%
                            </span>
                          </div>
                        </div>
                        
                        <Progress 
                          value={Math.min((kr.current / kr.target) * 100, 100)} 
                          className="h-1 mb-3" 
                        />

                        {/* Linked KPIs */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">Linked KPIs:</span>
                          {kr.linkedKPIs.length > 0 ? (
                            kr.linkedKPIs.map((kpiId) => {
                              const kpi = getLinkedKPIDetails(kpiId);
                              return (
                                <Badge 
                                  key={kpiId} 
                                  variant="secondary" 
                                  className="text-xs gap-1 bg-primary/10 text-primary border-primary/30"
                                >
                                  <Link2 className="h-3 w-3" />
                                  {kpi?.displayName || kpiId}
                                  <button 
                                    className="ml-1 hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onUnlinkKPI?.(kpiId, kr.id);
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
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardContent className="py-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-foreground">{okrs.length}</p>
              <p className="text-xs text-muted-foreground">Active OKRs</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {okrs.reduce((acc, o) => acc + o.keyResults.length, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Key Results</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">
                {okrs.filter(o => o.status === 'on-track').length}
              </p>
              <p className="text-xs text-muted-foreground">On Track</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {okrs.reduce((acc, o) => acc + o.keyResults.reduce((a, kr) => a + kr.linkedKPIs.length, 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground">Linked KPIs</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
