import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Plus, Shield, TrendingDown, Clock, User } from 'lucide-react';

interface Risk {
  id: string;
  title: string;
  category: 'operational' | 'financial' | 'technical' | 'legal' | 'strategic';
  likelihood: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high' | 'critical';
  status: 'identified' | 'mitigating' | 'monitoring' | 'resolved';
  owner: string;
  mitigation: string;
  lastReview: string;
}

const initialRisks: Risk[] = [
  {
    id: '1',
    title: 'Key person dependency on founding team',
    category: 'operational',
    likelihood: 'medium',
    impact: 'high',
    status: 'mitigating',
    owner: 'CEO',
    mitigation: 'Hire senior leadership, document all processes, establish succession plans',
    lastReview: '2026-01-02',
  },
  {
    id: '2',
    title: 'Data breach or security incident',
    category: 'technical',
    likelihood: 'low',
    impact: 'critical',
    status: 'monitoring',
    owner: 'CTO',
    mitigation: 'SOC2 compliance, regular pen testing, incident response plan',
    lastReview: '2026-01-03',
  },
  {
    id: '3',
    title: 'GDPR non-compliance penalties',
    category: 'legal',
    likelihood: 'low',
    impact: 'high',
    status: 'monitoring',
    owner: 'DPO',
    mitigation: 'Regular audits, DPA agreements, privacy-by-design architecture',
    lastReview: '2026-01-01',
  },
  {
    id: '4',
    title: 'Revenue concentration (top 3 clients)',
    category: 'financial',
    likelihood: 'medium',
    impact: 'high',
    status: 'mitigating',
    owner: 'CFO',
    mitigation: 'Diversify client base, long-term contracts, expand SMB segment',
    lastReview: '2025-12-28',
  },
  {
    id: '5',
    title: 'Competitor with deeper pockets enters market',
    category: 'strategic',
    likelihood: 'high',
    impact: 'medium',
    status: 'monitoring',
    owner: 'CEO',
    mitigation: 'Focus on niche differentiation, build switching costs, accelerate product development',
    lastReview: '2026-01-04',
  },
];

export function RiskRegistryPanel() {
  const [risks, setRisks] = useState<Risk[]>(initialRisks);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const getRiskScore = (likelihood: string, impact: string): number => {
    const likelihoodScore = { low: 1, medium: 2, high: 3 }[likelihood] || 1;
    const impactScore = { low: 1, medium: 2, high: 3, critical: 4 }[impact] || 1;
    return likelihoodScore * impactScore;
  };

  const getRiskColor = (score: number) => {
    if (score >= 9) return 'bg-destructive/10 text-destructive border-destructive/50';
    if (score >= 6) return 'bg-orange-500/10 text-orange-500 border-orange-500/50';
    if (score >= 3) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/50';
    return 'bg-green-500/10 text-green-500 border-green-500/50';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'operational': return '⚙️';
      case 'financial': return '💰';
      case 'technical': return '🔧';
      case 'legal': return '⚖️';
      case 'strategic': return '🎯';
      default: return '📋';
    }
  };

  const filteredRisks = filterCategory === 'all' 
    ? risks 
    : risks.filter(r => r.category === filterCategory);

  const sortedRisks = [...filteredRisks].sort((a, b) => 
    getRiskScore(b.likelihood, b.impact) - getRiskScore(a.likelihood, a.impact)
  );

  const riskSummary = {
    critical: risks.filter(r => getRiskScore(r.likelihood, r.impact) >= 9).length,
    high: risks.filter(r => getRiskScore(r.likelihood, r.impact) >= 6 && getRiskScore(r.likelihood, r.impact) < 9).length,
    medium: risks.filter(r => getRiskScore(r.likelihood, r.impact) >= 3 && getRiskScore(r.likelihood, r.impact) < 6).length,
    low: risks.filter(r => getRiskScore(r.likelihood, r.impact) < 3).length,
  };

  return (
    <div className="space-y-6">
      {/* Risk Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-destructive">{riskSummary.critical}</p>
            <p className="text-sm text-muted-foreground">Critical Risks</p>
          </CardContent>
        </Card>
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-orange-500">{riskSummary.high}</p>
            <p className="text-sm text-muted-foreground">High Risks</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-yellow-600">{riskSummary.medium}</p>
            <p className="text-sm text-muted-foreground">Medium Risks</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="pt-4">
            <p className="text-3xl font-bold text-green-500">{riskSummary.low}</p>
            <p className="text-sm text-muted-foreground">Low Risks</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="operational">Operational</SelectItem>
            <SelectItem value="financial">Financial</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="legal">Legal</SelectItem>
            <SelectItem value="strategic">Strategic</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Risk
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Risk</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Risk Title</Label>
                <Input placeholder="Describe the risk..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operational">Operational</SelectItem>
                      <SelectItem value="financial">Financial</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                      <SelectItem value="strategic">Strategic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Owner</Label>
                  <Input placeholder="Risk owner" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Likelihood</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Impact</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Mitigation Strategy</Label>
                <Textarea placeholder="How will this risk be mitigated?" />
              </div>
              <Button className="w-full" onClick={() => setIsAddDialogOpen(false)}>
                Add Risk
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Risk List */}
      <div className="space-y-4">
        {sortedRisks.map((risk) => {
          const score = getRiskScore(risk.likelihood, risk.impact);
          
          return (
            <Card key={risk.id} className={getRiskColor(score)}>
              <CardContent className="pt-4">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getCategoryIcon(risk.category)}</span>
                      <h3 className="font-semibold">{risk.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{risk.mitigation}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        {risk.likelihood} likelihood
                      </Badge>
                      <Badge variant="outline">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {risk.impact} impact
                      </Badge>
                      <Badge variant="outline">
                        <User className="h-3 w-3 mr-1" />
                        {risk.owner}
                      </Badge>
                      <Badge variant="outline">
                        <Clock className="h-3 w-3 mr-1" />
                        Reviewed {risk.lastReview}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className="text-lg px-3 py-1">
                      Score: {score}
                    </Badge>
                    <Badge variant={risk.status === 'resolved' ? 'default' : 'secondary'}>
                      {risk.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
