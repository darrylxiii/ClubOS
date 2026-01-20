import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Plus, TrendingDown, Clock, User, Trash2, Edit, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Risk {
  id: string;
  title: string;
  category: string;
  likelihood: string;
  impact: string;
  status: string;
  owner: string | null;
  mitigation: string | null;
  last_review: string | null;
  created_at: string;
}

interface NewRisk {
  title: string;
  category: string;
  likelihood: string;
  impact: string;
  owner: string;
  mitigation: string;
}

export function RiskRegistryPanel() {
  const queryClient = useQueryClient();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRisk, setNewRisk] = useState<NewRisk>({
    title: '',
    category: 'operational',
    likelihood: 'medium',
    impact: 'medium',
    owner: '',
    mitigation: '',
  });

  // Fetch risks from database
  const { data: risks = [], isLoading } = useQuery({
    queryKey: ['risk-registry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risk_registry')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Risk[];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (risk: NewRisk) => {
      const { error } = await supabase.from('risk_registry').insert({
        title: risk.title,
        category: risk.category,
        likelihood: risk.likelihood,
        impact: risk.impact,
        owner: risk.owner || null,
        mitigation: risk.mitigation || null,
        status: 'open',
        last_review: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-registry'] });
      toast.success('Risk added successfully');
      setIsAddDialogOpen(false);
      setNewRisk({ title: '', category: 'operational', likelihood: 'medium', impact: 'medium', owner: '', mitigation: '' });
    },
    onError: (error) => {
      toast.error('Failed to add risk: ' + error.message);
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('risk_registry')
        .update({ status, last_review: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-registry'] });
      toast.success('Risk status updated');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('risk_registry').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-registry'] });
      toast.success('Risk deleted');
    },
  });

  const getRiskScore = (likelihood: string, impact: string): number => {
    const likelihoodScore: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
    const impactScore: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
    return (likelihoodScore[likelihood] || 1) * (impactScore[impact] || 1);
  };

  const getRiskColor = (score: number) => {
    if (score >= 9) return 'bg-destructive/10 text-destructive border-destructive/50';
    if (score >= 6) return 'bg-orange-500/10 text-orange-500 border-orange-500/50';
    if (score >= 3) return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/50';
    return 'bg-green-500/10 text-green-500 border-green-500/50';
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      operational: '⚙️', financial: '💰', technical: '🔧', legal: '⚖️', market: '📈', security: '🔒',
    };
    return icons[category] || '📋';
  };

  const filteredRisks = filterCategory === 'all' ? risks : risks.filter(r => r.category === filterCategory);
  const sortedRisks = [...filteredRisks].sort((a, b) => getRiskScore(b.likelihood, b.impact) - getRiskScore(a.likelihood, a.impact));

  const riskSummary = {
    critical: risks.filter(r => getRiskScore(r.likelihood, r.impact) >= 9).length,
    high: risks.filter(r => getRiskScore(r.likelihood, r.impact) >= 6 && getRiskScore(r.likelihood, r.impact) < 9).length,
    medium: risks.filter(r => getRiskScore(r.likelihood, r.impact) >= 3 && getRiskScore(r.likelihood, r.impact) < 6).length,
    low: risks.filter(r => getRiskScore(r.likelihood, r.impact) < 3).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <SelectItem value="market">Market</SelectItem>
            <SelectItem value="security">Security</SelectItem>
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
                <Input
                  placeholder="Describe the risk..."
                  value={newRisk.title}
                  onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={newRisk.category} onValueChange={(v) => setNewRisk({ ...newRisk, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operational">Operational</SelectItem>
                      <SelectItem value="financial">Financial</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="legal">Legal</SelectItem>
                      <SelectItem value="market">Market</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Owner</Label>
                  <Input
                    placeholder="Risk owner"
                    value={newRisk.owner}
                    onChange={(e) => setNewRisk({ ...newRisk, owner: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Likelihood</Label>
                  <Select value={newRisk.likelihood} onValueChange={(v) => setNewRisk({ ...newRisk, likelihood: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Impact</Label>
                  <Select value={newRisk.impact} onValueChange={(v) => setNewRisk({ ...newRisk, impact: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Textarea
                  placeholder="How will this risk be mitigated?"
                  value={newRisk.mitigation}
                  onChange={(e) => setNewRisk({ ...newRisk, mitigation: e.target.value })}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate(newRisk)}
                disabled={!newRisk.title || createMutation.isPending}
              >
                {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Add Risk
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Risk List */}
      <div className="space-y-4">
        {sortedRisks.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No risks registered yet. Add your first risk to get started.
            </CardContent>
          </Card>
        ) : (
          sortedRisks.map((risk) => {
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
                      {risk.mitigation && (
                        <p className="text-sm text-muted-foreground mb-3">{risk.mitigation}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          {risk.likelihood} likelihood
                        </Badge>
                        <Badge variant="outline">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {risk.impact} impact
                        </Badge>
                        {risk.owner && (
                          <Badge variant="outline">
                            <User className="h-3 w-3 mr-1" />
                            {risk.owner}
                          </Badge>
                        )}
                        {risk.last_review && (
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            Reviewed {new Date(risk.last_review).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className="text-lg px-3 py-1">Score: {score}</Badge>
                      <Select
                        value={risk.status}
                        onValueChange={(status) => updateStatusMutation.mutate({ id: risk.id, status })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="mitigating">Mitigating</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(risk.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
