import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  useCommissionTiers, 
  useCreateCommissionTier, 
  useUpdateCommissionTier, 
  useDeleteCommissionTier 
} from "@/hooks/useCommissionTiers";
import { toast } from "sonner";
import { 
  Plus, 
  Trash2, 
  Save, 
  Layers,
  Percent,
  DollarSign,
  Loader2,
  Edit2
} from "lucide-react";

export function CommissionTierBuilder() {
  const { data: tiers, isLoading } = useCommissionTiers();
  const createTier = useCreateCommissionTier();
  const updateTier = useUpdateCommissionTier();
  const deleteTier = useDeleteCommissionTier();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTier, setNewTier] = useState({
    name: '',
    min_revenue: 0,
    max_revenue: 0,
    percentage: 0,
  });

  const handleCreate = async () => {
    if (!newTier.name || newTier.percentage <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createTier.mutateAsync({
        name: newTier.name,
        min_revenue: newTier.min_revenue,
        max_revenue: newTier.max_revenue || null,
        percentage: newTier.percentage,
        is_default: false,
      });
      setNewTier({ name: '', min_revenue: 0, max_revenue: 0, percentage: 0 });
      toast.success('Commission tier created');
    } catch (error) {
      toast.error('Failed to create tier');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTier.mutateAsync(id);
      toast.success('Tier deleted');
    } catch (error) {
      toast.error('Failed to delete tier');
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === 0) return '∞';
    return `€${value.toLocaleString()}`;
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Commission Tier Structure
        </CardTitle>
        <CardDescription>
          Define tiered commission rates based on revenue thresholds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing Tiers */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tiers?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No commission tiers defined</p>
              <p className="text-sm">Create your first tier below</p>
            </div>
          ) : (
            tiers?.map((tier, index) => (
              <div 
                key={tier.id}
                className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border/50"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{tier.name}</span>
                    <Badge variant="secondary" className="gap-1">
                      <Percent className="h-3 w-3" />
                      {tier.percentage}%
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(tier.min_revenue)} — {formatCurrency(tier.max_revenue)}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleDelete(tier.id)}
                  disabled={deleteTier.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Add New Tier */}
        <div className="border-t border-border/50 pt-4">
          <h4 className="text-sm font-medium mb-3">Add New Tier</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Tier Name</Label>
              <Input
                placeholder="e.g. Bronze"
                value={newTier.name}
                onChange={(e) => setNewTier(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Min Revenue (€)</Label>
              <Input
                type="number"
                min={0}
                value={newTier.min_revenue}
                onChange={(e) => setNewTier(prev => ({ ...prev, min_revenue: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max Revenue (€)</Label>
              <Input
                type="number"
                min={0}
                placeholder="Leave 0 for unlimited"
                value={newTier.max_revenue || ''}
                onChange={(e) => setNewTier(prev => ({ ...prev, max_revenue: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Commission %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={newTier.percentage}
                onChange={(e) => setNewTier(prev => ({ ...prev, percentage: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <Button 
            onClick={handleCreate} 
            className="mt-3 gap-2"
            disabled={createTier.isPending}
          >
            {createTier.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add Tier
          </Button>
        </div>

        {/* Quick Setup */}
        <div className="border-t border-border/50 pt-4">
          <h4 className="text-sm font-medium mb-2">Quick Setup Templates</h4>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={async () => {
                const templates = [
                  { name: 'Starter', min_revenue: 0, max_revenue: 50000, percentage: 5, is_default: true },
                  { name: 'Growth', min_revenue: 50000, max_revenue: 150000, percentage: 7.5, is_default: false },
                  { name: 'Pro', min_revenue: 150000, max_revenue: 300000, percentage: 10, is_default: false },
                  { name: 'Elite', min_revenue: 300000, max_revenue: null, percentage: 12.5, is_default: false },
                ];
                for (const t of templates) {
                  await createTier.mutateAsync(t);
                }
                toast.success('Default tiers created');
              }}
            >
              Apply Default Tiers
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
