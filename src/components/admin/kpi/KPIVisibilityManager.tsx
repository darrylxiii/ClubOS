import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Eye, EyeOff, Shield, Users, Lock, 
  Plus, Search, Filter, Settings
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
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
import { toast } from 'sonner';
import type { KPIMetric } from '@/hooks/useQuantumKPIs';

interface VisibilityRule {
  id: string;
  kpi_name: string;
  visible_to_roles: string[];
  is_sensitive: boolean;
  requires_approval: boolean;
  created_at: string;
}

interface KPIVisibilityManagerProps {
  availableKPIs?: KPIMetric[];
}

const ROLES = ['admin', 'strategist', 'partner', 'candidate'];

export function KPIVisibilityManager({ availableKPIs = [] }: KPIVisibilityManagerProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['admin']);
  const [isSensitive, setIsSensitive] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['kpi-visibility-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_visibility_rules')
        .select('*')
        .order('kpi_name');

      if (error) throw error;
      return (data || []) as unknown as VisibilityRule[];
    }
  });

  const upsertRuleMutation = useMutation({
    mutationFn: async (rule: Omit<VisibilityRule, 'id' | 'created_at'>) => {
      const { error } = await supabase
        .from('kpi_visibility_rules')
        .upsert({
          kpi_name: rule.kpi_name,
          visible_to_roles: rule.visible_to_roles,
          is_sensitive: rule.is_sensitive,
          requires_approval: rule.requires_approval
        }, {
          onConflict: 'kpi_name'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-visibility-rules'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('Visibility rule saved');
    },
    onError: (error) => {
      toast.error('Failed to save rule: ' + error.message);
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kpi_visibility_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-visibility-rules'] });
      toast.success('Rule deleted');
    }
  });

  const resetForm = () => {
    setSelectedKPI('');
    setSelectedRoles(['admin']);
    setIsSensitive(false);
    setRequiresApproval(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKPI || selectedRoles.length === 0) return;

    upsertRuleMutation.mutate({
      kpi_name: selectedKPI,
      visible_to_roles: selectedRoles,
      is_sensitive: isSensitive,
      requires_approval: requiresApproval
    });
  };

  const toggleRole = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.kpi_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || rule.visible_to_roles.includes(filterRole);
    return matchesSearch && matchesRole;
  });

  const kpisWithoutRules = availableKPIs.filter(
    kpi => !rules.some(r => r.kpi_name === kpi.kpi_name)
  );

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent" />
            KPI Visibility Manager
          </CardTitle>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Configure KPI Visibility</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Select KPI</Label>
                  <Select value={selectedKPI} onValueChange={setSelectedKPI}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a KPI..." />
                    </SelectTrigger>
                    <SelectContent>
                      {kpisWithoutRules.map(kpi => (
                        <SelectItem key={kpi.kpi_name} value={kpi.kpi_name}>
                          {kpi.kpi_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Visible to Roles</Label>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map(role => (
                      <Button
                        key={role}
                        type="button"
                        size="sm"
                        variant={selectedRoles.includes(role) ? "default" : "outline"}
                        onClick={() => toggleRole(role)}
                        className="capitalize"
                      >
                        {role}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Mark as Sensitive</Label>
                      <p className="text-xs text-muted-foreground">
                        Sensitive KPIs are highlighted in the UI
                      </p>
                    </div>
                    <Switch 
                      checked={isSensitive} 
                      onCheckedChange={setIsSensitive}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Export Approval</Label>
                      <p className="text-xs text-muted-foreground">
                        Exports need admin approval
                      </p>
                    </div>
                    <Switch 
                      checked={requiresApproval} 
                      onCheckedChange={setRequiresApproval}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={upsertRuleMutation.isPending || !selectedKPI}
                    className="bg-accent hover:bg-accent/90"
                  >
                    Save Rule
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search KPIs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {ROLES.map(role => (
                <SelectItem key={role} value={role} className="capitalize">
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Rules list */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="text-center py-8">
            <Settings className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchTerm || filterRole !== 'all' 
                ? 'No rules match your filters'
                : 'No visibility rules configured'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRules.map(rule => (
              <div 
                key={rule.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{rule.kpi_name}</span>
                    {rule.is_sensitive && (
                      <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                        <Lock className="h-3 w-3 mr-1" />
                        Sensitive
                      </Badge>
                    )}
                    {rule.requires_approval && (
                      <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                        <Shield className="h-3 w-3 mr-1" />
                        Approval Required
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="flex gap-1">
                      {rule.visible_to_roles.map(role => (
                        <Badge key={role} variant="secondary" className="text-xs capitalize">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteRuleMutation.mutate(rule.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {rules.length} rules configured
            </span>
            <span className="flex items-center gap-1">
              <EyeOff className="h-3.5 w-3.5" />
              {kpisWithoutRules.length} KPIs unrestricted
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
