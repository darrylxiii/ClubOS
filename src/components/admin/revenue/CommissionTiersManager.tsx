import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, TrendingUp } from "lucide-react";
const formatCurrency = (amount: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);

interface CommissionTier {
  id: string;
  name: string;
  min_revenue: number;
  max_revenue: number | null;
  percentage: number;
  is_active: boolean;
  created_at: string;
}

export function CommissionTiersManager() {
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<CommissionTier | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    min_revenue: 0,
    max_revenue: null as number | null,
    percentage: 10,
    is_active: true,
  });

  const { data: tiers, isLoading } = useQuery({
    queryKey: ["commission-tiers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_tiers")
        .select("*")
        .order("min_revenue", { ascending: true });

      if (error) throw error;
      return data as CommissionTier[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (selectedTier) {
        // Update existing
        const { error } = await supabase
          .from("commission_tiers")
          .update({
            name: formData.name,
            min_revenue: formData.min_revenue,
            max_revenue: formData.max_revenue,
            percentage: formData.percentage,
            is_active: formData.is_active,
          })
          .eq("id", selectedTier.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("commission_tiers")
          .insert({
            name: formData.name,
            min_revenue: formData.min_revenue,
            max_revenue: formData.max_revenue,
            percentage: formData.percentage,
            is_active: formData.is_active,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(selectedTier ? "Tier updated" : "Tier created");
      queryClient.invalidateQueries({ queryKey: ["commission-tiers"] });
      setEditDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error("Save error:", error);
      toast.error("Failed to save tier");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("commission_tiers")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tier deleted");
      queryClient.invalidateQueries({ queryKey: ["commission-tiers"] });
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Failed to delete tier");
    },
  });

  const resetForm = () => {
    setSelectedTier(null);
    setFormData({
      name: "",
      min_revenue: 0,
      max_revenue: null,
      percentage: 10,
      is_active: true,
    });
  };

  const openEditDialog = (tier?: CommissionTier) => {
    if (tier) {
      setSelectedTier(tier);
      setFormData({
        name: tier.name,
        min_revenue: tier.min_revenue,
        max_revenue: tier.max_revenue,
        percentage: tier.percentage,
        is_active: tier.is_active,
      });
    } else {
      resetForm();
    }
    setEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Commission Tiers
              </CardTitle>
              <CardDescription>
                Manage commission rates based on recruiter performance
              </CardDescription>
            </div>
            <Button onClick={() => openEditDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tier
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tier Name</TableHead>
                <TableHead>Revenue Range</TableHead>
                <TableHead>Commission %</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tiers?.map((tier) => (
                <TableRow key={tier.id}>
                  <TableCell className="font-medium">{tier.name}</TableCell>
                  <TableCell>
                    {formatCurrency(tier.min_revenue)} - {tier.max_revenue ? formatCurrency(tier.max_revenue) : "∞"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tier.percentage}%</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tier.is_active ? "default" : "outline"}>
                      {tier.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(tier)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(tier.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!tiers || tiers.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No commission tiers configured. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTier ? "Edit Commission Tier" : "Create Commission Tier"}
            </DialogTitle>
            <DialogDescription>
              Define revenue thresholds and commission percentages for recruiters.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tier Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Gold, Platinum, Diamond"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_revenue">Min Revenue (€)</Label>
                <Input
                  id="min_revenue"
                  type="number"
                  value={formData.min_revenue}
                  onChange={(e) => setFormData({ ...formData, min_revenue: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_revenue">Max Revenue (€)</Label>
                <Input
                  id="max_revenue"
                  type="number"
                  value={formData.max_revenue || ""}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    max_revenue: e.target.value ? Number(e.target.value) : null 
                  })}
                  placeholder="Leave empty for unlimited"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="percentage">Commission Percentage</Label>
              <Input
                id="percentage"
                type="number"
                min={0}
                max={100}
                value={formData.percentage}
                onChange={(e) => setFormData({ ...formData, percentage: Number(e.target.value) })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!formData.name || saveMutation.isPending}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {selectedTier ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
